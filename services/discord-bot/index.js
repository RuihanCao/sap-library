require("dotenv").config({ path: ".env.local" });

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const {
  ingestParticipationReplay,
  appendReplayTags,
  normalizeTags,
  extractParticipationId
} = require("./replay-ingest");
const {
  ensureDiscordIngestChannelsTable,
  listDiscordIngestChannels,
  upsertDiscordIngestChannel,
  deleteDiscordIngestChannel
} = require("./channel-config");

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const ALLOWED_GUILD_IDS = (process.env.DISCORD_ALLOWED_GUILD_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const ALLOWED_CHANNEL_IDS = (process.env.DISCORD_ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const AUTO_INGEST_CHANNEL_IDS = (process.env.DISCORD_AUTO_INGEST_CHANNEL_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const AUTO_REGISTER_COMMANDS = process.env.DISCORD_REGISTER_COMMANDS !== "false";

if (!BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required");
}
if (!APPLICATION_ID) {
  throw new Error("DISCORD_APPLICATION_ID is required");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const commands = [
  new SlashCommandBuilder()
    .setName("sap-upload")
    .setDescription("Upload a SAP replay by participation ID and apply tags")
    .addStringOption((option) =>
      option
        .setName("participation_id")
        .setDescription("Participation ID / replay payload / replay URL")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tournament")
        .setDescription("Tournament tag (ex: weekly-cup-1)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("player")
        .setDescription("Player tag (ex: player UUID or alias)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("set")
        .setDescription("Set tag (ex: set-5)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("tags")
        .setDescription("Extra tags, comma-separated")
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("sap-ping")
    .setDescription("Check if the SAP bot is alive")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("sap-watch-here")
    .setDescription("Enable replay auto-ingest in this channel")
    .addStringOption((option) =>
      option
        .setName("tournament")
        .setDescription("Tournament tag name (ex: summit-9)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName("sap-unwatch-here")
    .setDescription("Disable replay auto-ingest in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName("sap-watch-list")
    .setDescription("List channels with replay auto-ingest enabled in this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

function normalizeTagToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function buildBotTags(interaction, options) {
  const tags = [
    "source:discord",
    interaction.guildId ? `discord:guild:${interaction.guildId}` : null,
    interaction.channelId ? `discord:channel:${interaction.channelId}` : null,
    interaction.user?.id ? `discord:user:${interaction.user.id}` : null
  ];

  if (options.tournament) {
    tags.push(`tournament:${normalizeTagToken(options.tournament)}`);
  }
  if (options.player) {
    tags.push(`player:${normalizeTagToken(options.player)}`);
  }
  if (options.setName) {
    tags.push(`set:${normalizeTagToken(options.setName)}`);
  }

  const extraTags = normalizeTags(options.extraTags).map((tag) => normalizeTagToken(tag));
  tags.push(...extraTags);

  return Array.from(new Set(tags.filter(Boolean)));
}

function buildAutoIngestTags(message, tournamentTag) {
  const normalizedTournament = normalizeTagToken(tournamentTag);
  const tags = [
    "source:discord",
    message.guildId ? `discord:guild:${message.guildId}` : null,
    message.channelId ? `discord:channel:${message.channelId}` : null,
    message.author?.id ? `discord:user:${message.author.id}` : null,
    message.author?.username ? `discord:username:${normalizeTagToken(message.author.username)}` : null
  ];

  if (normalizedTournament) {
    tags.push(`tournament:${normalizedTournament}`);
    tags.push(normalizedTournament);
  } else {
    // Legacy fallback for static env channels that don't have DB watcher config.
    tags.push("summit", "mini", "fuji");
  }

  return Array.from(new Set(tags.map((tag) => normalizeTagToken(tag)).filter(Boolean)));
}

function interactionGuildAllowed(interaction) {
  if (ALLOWED_GUILD_IDS.length && (!interaction.guildId || !ALLOWED_GUILD_IDS.includes(interaction.guildId))) {
    return false;
  }
  return true;
}

function interactionAllowed(interaction) {
  if (!interactionGuildAllowed(interaction)) {
    return false;
  }
  if (ALLOWED_CHANNEL_IDS.length && (!interaction.channelId || !ALLOWED_CHANNEL_IDS.includes(interaction.channelId))) {
    return false;
  }
  return true;
}

let watchedChannelsByGuild = new Map();

function addWatchedChannel(guildId, channelId, tournamentTag) {
  if (!guildId || !channelId) return;
  const existing = watchedChannelsByGuild.get(guildId) || new Map();
  existing.set(channelId, tournamentTag ? normalizeTagToken(tournamentTag) : null);
  watchedChannelsByGuild.set(guildId, existing);
}

function removeWatchedChannel(guildId, channelId) {
  const existing = watchedChannelsByGuild.get(guildId);
  if (!existing) return;
  existing.delete(channelId);
  if (!existing.size) {
    watchedChannelsByGuild.delete(guildId);
  }
}

function replaceWatchedChannels(rows) {
  const next = new Map();
  for (const row of rows || []) {
    const guildId = row.guild_id;
    const channelId = row.channel_id;
    if (!guildId || !channelId) continue;
    const byChannel = next.get(guildId) || new Map();
    byChannel.set(
      channelId,
      row.tournament_tag ? normalizeTagToken(row.tournament_tag) : null
    );
    next.set(guildId, byChannel);
  }
  watchedChannelsByGuild = next;
}

function watchedChannelTournamentTag(guildId, channelId) {
  if (!guildId || !channelId) return null;
  const channels = watchedChannelsByGuild.get(guildId);
  if (!channels || !channels.has(channelId)) return null;
  return channels.get(channelId) || null;
}

function channelConfiguredForAutoIngest(guildId, channelId) {
  if (!guildId || !channelId) return false;
  if (AUTO_INGEST_CHANNEL_IDS.includes(channelId)) return true;
  const channels = watchedChannelsByGuild.get(guildId);
  return Boolean(channels && channels.has(channelId));
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID), { body: commands });
    console.log(`Registered ${commands.length} guild commands for guild ${GUILD_ID}`);
    return;
  }

  await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: commands });
  console.log(`Registered ${commands.length} global commands`);
}

async function handleUpload(interaction) {
  if (!interactionAllowed(interaction)) {
    await interaction.reply({
      content: "Uploads are not enabled in this server/channel.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const participationInput = interaction.options.getString("participation_id", true);
  const tournament = interaction.options.getString("tournament") || "";
  const player = interaction.options.getString("player") || "";
  const setName = interaction.options.getString("set") || "";
  const extraTags = interaction.options.getString("tags") || "";

  try {
    const ingestResult = await ingestParticipationReplay(participationInput);
    if (ingestResult.status === "invalid_participation_id") {
      await interaction.editReply("Invalid participation ID. Provide a UUID, replay payload, or replay URL.");
      return;
    }

    const botTags = buildBotTags(interaction, {
      tournament,
      player,
      setName,
      extraTags
    });

    const tagResult = await appendReplayTags(ingestResult.replayId, botTags, {
      participationId: ingestResult.participationId,
      matchId: ingestResult.matchId
    });
    const statusLabel = ingestStatusLabel(ingestResult.status);

    await interaction.editReply(
      [
        `${statusLabel}.`,
        `Replay ID: ${ingestResult.replayId}`,
        `Participation ID: ${ingestResult.participationId}`,
        `Tags: ${(tagResult.tags || []).join(", ") || "(none)"}`
      ].join("\n")
    );
  } catch (error) {
    console.error("sap-upload failed", error);
    await interaction.editReply(`Upload failed: ${error?.message || "Unknown error"}`);
  }
}

function ingestStatusLabel(status) {
  if (status === "inserted") return "Inserted replay";
  if (status === "exists_participation") return "Replay already existed (same participation ID)";
  return "Replay already existed (same match)";
}

async function handleWatchHere(interaction) {
  if (!interactionGuildAllowed(interaction)) {
    await interaction.reply({
      content: "Auto-ingest is not enabled in this server.",
      ephemeral: true
    });
    return;
  }

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({
      content: "This command can only be used in a server text channel.",
      ephemeral: true
    });
    return;
  }

  const tournamentInput = interaction.options.getString("tournament", true);
  const tournamentTag = normalizeTagToken(tournamentInput);
  if (!tournamentTag) {
    await interaction.reply({
      content: "Tournament name is required.",
      ephemeral: true
    });
    return;
  }

  await upsertDiscordIngestChannel({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    tournamentTag,
    updatedBy: interaction.user?.id || null
  });
  addWatchedChannel(interaction.guildId, interaction.channelId, tournamentTag);

  await interaction.reply({
    content: `Auto-ingest enabled for <#${interaction.channelId}> with tournament:${tournamentTag}.`,
    ephemeral: true
  });
}

async function handleUnwatchHere(interaction) {
  if (!interactionGuildAllowed(interaction)) {
    await interaction.reply({
      content: "Auto-ingest is not enabled in this server.",
      ephemeral: true
    });
    return;
  }

  if (!interaction.guildId || !interaction.channelId) {
    await interaction.reply({
      content: "This command can only be used in a server text channel.",
      ephemeral: true
    });
    return;
  }

  await deleteDiscordIngestChannel({
    guildId: interaction.guildId,
    channelId: interaction.channelId
  });
  removeWatchedChannel(interaction.guildId, interaction.channelId);

  await interaction.reply({
    content: `Auto-ingest disabled for <#${interaction.channelId}>.`,
    ephemeral: true
  });
}

async function handleWatchList(interaction) {
  if (!interactionGuildAllowed(interaction)) {
    await interaction.reply({
      content: "Auto-ingest is not enabled in this server.",
      ephemeral: true
    });
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true
    });
    return;
  }

  const rows = await listDiscordIngestChannels();
  replaceWatchedChannels(rows);
  const configured = watchedChannelsByGuild.get(guildId) || new Map();
  const configuredList = [...configured.entries()];

  const staticList = AUTO_INGEST_CHANNEL_IDS.length
    ? `Static env channels: ${AUTO_INGEST_CHANNEL_IDS.map((id) => `<#${id}>`).join(", ")}`
    : "Static env channels: (none)";

  if (!configuredList.length) {
    await interaction.reply({
      content: `DB watched channels: (none)\n${staticList}`,
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    content: `DB watched channels: ${configuredList
      .map(([channelId, tournamentTag]) => `<#${channelId}> (tournament:${tournamentTag || "unset"})`)
      .join(", ")}\n${staticList}`,
    ephemeral: true
  });
}

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once("clientReady", async () => {
    try {
      if (client.user) {
        await client.user.setPresence({ status: "online" });
      }
      await ensureDiscordIngestChannelsTable();
      const rows = await listDiscordIngestChannels();
      replaceWatchedChannels(rows);
    } catch (error) {
      console.warn("Bot readiness setup failed", error?.message || error);
    }

    console.log(`Discord bot logged in as ${client.user?.tag || "unknown user"}`);
    console.log(`Connected guilds: ${client.guilds.cache.size}`);
    console.log(
      `Auto-ingest DB channels loaded: ${[...watchedChannelsByGuild.values()].reduce((acc, byChannel) => acc + byChannel.size, 0)}`
    );
    console.log(`Auto-ingest env channels loaded: ${AUTO_INGEST_CHANNEL_IDS.length}`);
  });

  client.on("shardDisconnect", (event) => {
    console.warn(`Discord shard disconnected: code=${event?.code ?? "unknown"}`);
  });

  client.on("shardError", (error) => {
    console.error("Discord shard error", error);
  });

  client.on("shardResume", (id, replayed) => {
    console.log(`Discord shard resumed: id=${id}, replayed=${replayed}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    console.log(
      `Interaction received: command=${interaction.commandName} guild=${interaction.guildId || "dm"} channel=${interaction.channelId || "unknown"} user=${interaction.user?.id || "unknown"}`
    );

    try {
      if (interaction.commandName === "sap-ping") {
        await interaction.reply({ content: "pong" });
        return;
      }

      if (interaction.commandName === "sap-upload") {
        await handleUpload(interaction);
        return;
      }

      if (interaction.commandName === "sap-watch-here") {
        await handleWatchHere(interaction);
        return;
      }

      if (interaction.commandName === "sap-unwatch-here") {
        await handleUnwatchHere(interaction);
        return;
      }

      if (interaction.commandName === "sap-watch-list") {
        await handleWatchList(interaction);
        return;
      }

      await interaction.reply({
        content: `Unknown command: ${interaction.commandName}`,
        ephemeral: true
      });
    } catch (error) {
      console.error("interactionCreate handler failed", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Command failed unexpectedly.",
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.followUp({
          content: "Command failed unexpectedly.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  });

  const activeMessageIngest = new Set();
  client.on("messageCreate", async (message) => {
    if (!message || message.author?.bot) return;
    if (!message.guildId || !message.channelId) return;
    if (ALLOWED_GUILD_IDS.length && !ALLOWED_GUILD_IDS.includes(message.guildId)) return;
    if (!channelConfiguredForAutoIngest(message.guildId, message.channelId)) return;

    const participationId = extractParticipationId(message.content || "");
    if (!participationId) return;
    if (activeMessageIngest.has(message.id)) return;

    activeMessageIngest.add(message.id);
    try {
      const ingestResult = await ingestParticipationReplay(participationId);
      if (ingestResult.status === "invalid_participation_id") {
        return;
      }

      const tournamentTag = watchedChannelTournamentTag(message.guildId, message.channelId);
      const tagResult = await appendReplayTags(ingestResult.replayId, buildAutoIngestTags(message, tournamentTag), {
        participationId: ingestResult.participationId,
        matchId: ingestResult.matchId
      });
      const statusLabel = ingestStatusLabel(ingestResult.status);
      await message.reply({
        content: [
          `${statusLabel}.`,
          `Replay ID: ${ingestResult.replayId}`,
          `Participation ID: ${ingestResult.participationId}`,
          `Tags: ${(tagResult.tags || []).join(", ") || "(none)"}`
        ].join("\n"),
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error("auto-ingest message handler failed", {
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        userId: message.author?.id,
        error: error?.message || error
      });
      await message.reply({
        content: `Auto-upload failed: ${error?.message || "Unknown error"}`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
    } finally {
      activeMessageIngest.delete(message.id);
    }
  });

  await client.login(BOT_TOKEN);

  if (AUTO_REGISTER_COMMANDS) {
    registerCommands().catch((error) => {
      console.error("Command registration failed (bot will remain online)", error);
    });
  }
}

main().catch((error) => {
  console.error("Discord bot startup failed", error);
  process.exit(1);
});
