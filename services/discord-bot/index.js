require("dotenv").config({ path: ".env.local" });

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const {
  ingestParticipationReplay,
  appendReplayTags,
  normalizeTags
} = require("./replay-ingest");

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

function interactionAllowed(interaction) {
  if (ALLOWED_GUILD_IDS.length && (!interaction.guildId || !ALLOWED_GUILD_IDS.includes(interaction.guildId))) {
    return false;
  }
  if (ALLOWED_CHANNEL_IDS.length && (!interaction.channelId || !ALLOWED_CHANNEL_IDS.includes(interaction.channelId))) {
    return false;
  }
  return true;
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

    const tagResult = await appendReplayTags(ingestResult.replayId, botTags);
    const statusLabel =
      ingestResult.status === "inserted"
        ? "Inserted replay"
        : ingestResult.status === "exists_participation"
          ? "Replay already existed (same participation ID)"
          : "Replay already existed (same match)";

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

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once("clientReady", async () => {
    try {
      if (client.user) {
        await client.user.setPresence({ status: "online" });
      }
    } catch (error) {
      console.warn("Failed to set presence", error?.message || error);
    }

    console.log(`Discord bot logged in as ${client.user?.tag || "unknown user"}`);
    console.log(`Connected guilds: ${client.guilds.cache.size}`);
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
