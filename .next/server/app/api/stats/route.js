(()=>{var a={};a.id=967,a.ids=[967],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},4287:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{handler:()=>x,patchFetch:()=>w,routeModule:()=>y,serverHooks:()=>B,workAsyncStorage:()=>z,workUnitAsyncStorage:()=>A});var e=c(5736),f=c(9117),g=c(4044),h=c(9326),i=c(2324),j=c(261),k=c(4290),l=c(5328),m=c(8928),n=c(6595),o=c(3421),p=c(7679),q=c(1681),r=c(3446),s=c(6439),t=c(1356),u=c(9797),v=a([u]);u=(v.then?(await v)():v)[0];let y=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/stats/route",pathname:"/api/stats",filename:"route",bundlePath:"app/api/stats/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"C:\\Users\\porte\\Downloads\\sap-replay-bot-main\\sap-replay-bot-main\\app\\api\\stats\\route.js",nextConfigOutput:"",userland:u}),{workAsyncStorage:z,workUnitAsyncStorage:A,serverHooks:B}=y;function w(){return(0,g.patchFetch)({workAsyncStorage:z,workUnitAsyncStorage:A})}async function x(a,b,c){var d;let e="/api/stats/route";"/index"===e&&(e="/");let g=await y.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(z.dynamicRoutes[E]||z.routes[D]);if(F&&!x){let a=!!z.routes[D],b=z.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||y.isDev||x||(G=D,G="/index"===G?"/":G);let H=!0===y.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>y.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>y.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await y.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await y.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await y.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}d()}catch(a){d(a)}})},4870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4939:a=>{"use strict";a.exports=import("pg")},6439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},6487:()=>{},6825:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.d(b,{d:()=>h});var e=c(4939),f=a([e]);e=(f.then?(await f)():f)[0];let g=globalThis,h=g.pgPool||new e.Pool({connectionString:process.env.DATABASE_URL});g.pgPool||(g.pgPool=h),d()}catch(a){d(a)}})},8335:()=>{},9121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},9294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},9797:(a,b,c)=>{"use strict";c.a(a,async(a,d)=>{try{c.r(b),c.d(b,{GET:()=>i,dynamic:()=>k,runtime:()=>j});var e=c(641),f=c(6825),g=a([f]);f=(g.then?(await g)():g)[0];let j="nodejs",k="force-dynamic",l=["Custom","Weekly"];function h(a){return a?a.split(",").map(a=>a.trim()).filter(Boolean):[]}async function i(a){let{searchParams:b}=new URL(a.url),c=b.get("pack")||"",d=b.get("opponentPack")||"",g=h(b.get("pet")),i=b.get("petLevel")||"",j=h(b.get("perk")),k=h(b.get("toy")),m=h(b.get("allyPet")),n=h(b.get("opponentPet")),o=h(b.get("allyPerk")),p=h(b.get("opponentPerk")),q=h(b.get("allyToy")),r=h(b.get("opponentToy")),s=b.get("scope")||"game",t=h(b.get("tags")),u=[],v=["r.match_type != 'arena'","r.pack is not null","r.opponent_pack is not null",`r.pack != all($${u.length+1})`,`r.opponent_pack != all($${u.length+1})`];u.push(l),c&&(u.push(c),v.push(`r.pack = $${u.length}`)),d&&(u.push(d),v.push(`r.opponent_pack = $${u.length}`)),t.length&&(u.push(t),v.push(`coalesce(r.tags, '{}'::text[]) && $${u.length}`));let w=g.length?"and p.pet_name = any($PET)":"",x=i?"and p.level = $PET_LEVEL":"",y=j.length?"and p.perk = any($PERK)":"",z=k.length?"and p.toy = any($TOY)":"",A=m.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.pet_name = any($ALLY_PET))":"",B=n.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.pet_name = any($OPP_PET))":"",C=o.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.perk = any($ALLY_PERK))":"",D=p.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.perk = any($OPP_PERK))":"",E=q.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'player' and ap.toy = any($ALLY_TOY))":"",F=r.length?"and exists (select 1 from pets ap where ap.replay_id = r.id and ap.side = 'opponent' and ap.toy = any($OPP_TOY))":"",G=m.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.pet_name = any($ALLY_PET))":"",H=n.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.pet_name = any($OPP_PET))":"",I=o.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.perk = any($ALLY_PERK))":"",J=p.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.perk = any($OPP_PERK))":"",K=q.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'player' and ap.toy = any($ALLY_TOY))":"",L=r.length?"and exists (select 1 from pets ap where ap.replay_id = t.replay_id and ap.turn_number = t.turn_number and ap.side = 'opponent' and ap.toy = any($OPP_TOY))":"",M=`
    with base as (
      select r.id, r.pack, r.opponent_pack
      from replays r
      where ${v.join(" and ")}
      ${A}
      ${B}
      ${C}
      ${D}
      ${E}
      ${F}
    ),
    last_turn as (
      select t.replay_id, max(t.turn_number) as max_turn
      from turns t
      group by t.replay_id
    ),
    outcomes as (
      select t.replay_id, t.outcome
      from turns t
      join last_turn lt on lt.replay_id = t.replay_id and lt.max_turn = t.turn_number
    ),
    pet_any as (
      select distinct b.id, p.pet_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' ${w} ${x}
    ),
    pet_end as (
      select distinct b.id, p.pet_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' ${w} ${x}
    ),
    opp_pet_any as (
      select distinct b.id, p.pet_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' ${w} ${x}
    ),
    opp_pet_end as (
      select distinct b.id, p.pet_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' ${w} ${x}
    ),
    perk_any as (
      select distinct b.id, p.perk as perk_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' and p.perk is not null ${y}
    ),
    perk_end as (
      select distinct b.id, p.perk as perk_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' and p.perk is not null ${y}
    ),
    opp_perk_any as (
      select distinct b.id, p.perk as perk_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' and p.perk is not null ${y}
    ),
    opp_perk_end as (
      select distinct b.id, p.perk as perk_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' and p.perk is not null ${y}
    ),
    toy_any as (
      select distinct b.id, p.toy as toy_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'player' and p.toy is not null ${z}
    ),
    toy_end as (
      select distinct b.id, p.toy as toy_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'player' and p.toy is not null ${z}
    ),
    opp_toy_any as (
      select distinct b.id, p.toy as toy_name
      from base b
      join pets p on p.replay_id = b.id
      where p.side = 'opponent' and p.toy is not null ${z}
    ),
    opp_toy_end as (
      select distinct b.id, p.toy as toy_name
      from base b
      join last_turn lt on lt.replay_id = b.id
      join pets p on p.replay_id = b.id and p.turn_number = lt.max_turn
      where p.side = 'opponent' and p.toy is not null ${z}
    ),
    pet_list as (
      select distinct pet_name from pet_any
      union
      select distinct pet_name from pet_end
    ),
    opp_pet_list as (
      select distinct pet_name from opp_pet_any
      union
      select distinct pet_name from opp_pet_end
    ),
    perk_list as (
      select distinct perk_name from perk_any
      union
      select distinct perk_name from perk_end
    ),
    opp_perk_list as (
      select distinct perk_name from opp_perk_any
      union
      select distinct perk_name from opp_perk_end
    ),
    toy_list as (
      select distinct toy_name from toy_any
      union
      select distinct toy_name from toy_end
    ),
    opp_toy_list as (
      select distinct toy_name from opp_toy_any
      union
      select distinct toy_name from opp_toy_end
    ),
    combined_pack as (
      select
        b.id,
        b.pack as pack,
        o.outcome as outcome,
        'player'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
      union all
      select
        b.id,
        b.opponent_pack as pack,
        o.outcome as outcome,
        'opponent'::text as side
      from base b
      join outcomes o on o.replay_id = b.id
    ),
    combined_pet_any as (
      select id, pet_name, 'player'::text as side from pet_any
      union all
      select id, pet_name, 'opponent'::text as side from opp_pet_any
    ),
    combined_pet_end as (
      select id, pet_name, 'player'::text as side from pet_end
      union all
      select id, pet_name, 'opponent'::text as side from opp_pet_end
    ),
    combined_pet_list as (
      select distinct pet_name from combined_pet_any
      union
      select distinct pet_name from combined_pet_end
    ),
    combined_perk_any as (
      select id, perk_name, 'player'::text as side from perk_any
      union all
      select id, perk_name, 'opponent'::text as side from opp_perk_any
    ),
    combined_perk_end as (
      select id, perk_name, 'player'::text as side from perk_end
      union all
      select id, perk_name, 'opponent'::text as side from opp_perk_end
    ),
    combined_perk_list as (
      select distinct perk_name from combined_perk_any
      union
      select distinct perk_name from combined_perk_end
    ),
    combined_toy_any as (
      select id, toy_name, 'player'::text as side from toy_any
      union all
      select id, toy_name, 'opponent'::text as side from opp_toy_any
    ),
    combined_toy_end as (
      select id, toy_name, 'player'::text as side from toy_end
      union all
      select id, toy_name, 'opponent'::text as side from opp_toy_end
    ),
    combined_toy_list as (
      select distinct toy_name from combined_toy_any
      union
      select distinct toy_name from combined_toy_end
    )
    select
      (select count(*) from base) as total_games,
      (select coalesce(json_agg(row_to_json(cps)), '[]'::json) from (
        select
          cp.pack as pack,
          count(*)::int as games,
          sum(case
            when cp.side = 'player' and cp.outcome = 1 then 1
            when cp.side = 'opponent' and cp.outcome = 2 then 1
            else 0
          end)::int as wins,
          sum(case when cp.outcome = 3 then 1 else 0 end)::int as draws
        from combined_pack cp
        group by cp.pack
        order by cp.pack
      ) cps) as pack_stats,
      (select coalesce(json_agg(row_to_json(pet_stats)), '[]'::json) from (
        select
          pl.pet_name as pet_name,
          (select count(*) from combined_pet_any pa where pa.pet_name = pl.pet_name)::int as games_with,
          (select count(*) from combined_pet_any pa join outcomes o on o.replay_id = pa.id where pa.pet_name = pl.pet_name and (
            (pa.side = 'player' and o.outcome = 1) or (pa.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_pet_any pa join outcomes o on o.replay_id = pa.id where pa.pet_name = pl.pet_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_pet_end pe where pe.pet_name = pl.pet_name)::int as games_end,
          (select count(*) from combined_pet_end pe join outcomes o on o.replay_id = pe.id where pe.pet_name = pl.pet_name and (
            (pe.side = 'player' and o.outcome = 1) or (pe.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_pet_end pe join outcomes o on o.replay_id = pe.id where pe.pet_name = pl.pet_name and o.outcome = 3)::int as draws_end
        from combined_pet_list pl
        order by (select count(*) from combined_pet_any pa where pa.pet_name = pl.pet_name) desc, pl.pet_name asc
        limit 50
      ) pet_stats) as pet_stats,
      (select coalesce(json_agg(row_to_json(perk_stats)), '[]'::json) from (
        select
          pl.perk_name as perk_name,
          (select count(*) from combined_perk_any pa where pa.perk_name = pl.perk_name)::int as games_with,
          (select count(*) from combined_perk_any pa join outcomes o on o.replay_id = pa.id where pa.perk_name = pl.perk_name and (
            (pa.side = 'player' and o.outcome = 1) or (pa.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_perk_any pa join outcomes o on o.replay_id = pa.id where pa.perk_name = pl.perk_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_perk_end pe where pe.perk_name = pl.perk_name)::int as games_end,
          (select count(*) from combined_perk_end pe join outcomes o on o.replay_id = pe.id where pe.perk_name = pl.perk_name and (
            (pe.side = 'player' and o.outcome = 1) or (pe.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_perk_end pe join outcomes o on o.replay_id = pe.id where pe.perk_name = pl.perk_name and o.outcome = 3)::int as draws_end
        from combined_perk_list pl
        order by (select count(*) from combined_perk_any pa where pa.perk_name = pl.perk_name) desc, pl.perk_name asc
        limit 50
      ) perk_stats) as perk_stats,
      (select coalesce(json_agg(row_to_json(toy_stats)), '[]'::json) from (
        select
          tl.toy_name as toy_name,
          (select count(*) from combined_toy_any ta where ta.toy_name = tl.toy_name)::int as games_with,
          (select count(*) from combined_toy_any ta join outcomes o on o.replay_id = ta.id where ta.toy_name = tl.toy_name and (
            (ta.side = 'player' and o.outcome = 1) or (ta.side = 'opponent' and o.outcome = 2)
          ))::int as wins_with,
          (select count(*) from combined_toy_any ta join outcomes o on o.replay_id = ta.id where ta.toy_name = tl.toy_name and o.outcome = 3)::int as draws_with,
          (select count(*) from combined_toy_end te where te.toy_name = tl.toy_name)::int as games_end,
          (select count(*) from combined_toy_end te join outcomes o on o.replay_id = te.id where te.toy_name = tl.toy_name and (
            (te.side = 'player' and o.outcome = 1) or (te.side = 'opponent' and o.outcome = 2)
          ))::int as wins_end,
          (select count(*) from combined_toy_end te join outcomes o on o.replay_id = te.id where te.toy_name = tl.toy_name and o.outcome = 3)::int as draws_end
        from combined_toy_list tl
        order by (select count(*) from combined_toy_any ta where ta.toy_name = tl.toy_name) desc, tl.toy_name asc
        limit 50
      ) toy_stats) as toy_stats
  `,N=`
    with base as (
      select r.id, r.pack, r.opponent_pack
      from replays r
      where ${v.join(" and ")}
    ),
    turns_base as (
      select t.id as turn_id, t.replay_id, t.turn_number, t.outcome
      from turns t
      join base b on b.id = t.replay_id
      where 1=1
      ${G}
      ${H}
      ${I}
      ${J}
      ${K}
      ${L}
    ),
    pack_rounds as (
      select tb.turn_id, b.pack as pack, 'player'::text as side, tb.outcome
      from turns_base tb
      join base b on b.id = tb.replay_id
      union all
      select tb.turn_id, b.opponent_pack as pack, 'opponent'::text as side, tb.outcome
      from turns_base tb
      join base b on b.id = tb.replay_id
    ),
    pet_rounds as (
      select
        tb.turn_id,
        p.pet_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      where p.pet_name is not null ${w} ${x}
      group by tb.turn_id, p.pet_name, tb.outcome, p.side
    ),
    perk_rounds as (
      select
        tb.turn_id,
        p.perk as perk_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      where p.perk is not null ${y}
      group by tb.turn_id, p.perk, tb.outcome, p.side
    ),
    toy_rounds as (
      select
        tb.turn_id,
        p.toy as toy_name,
        tb.outcome,
        p.side
      from turns_base tb
      join pets p on p.replay_id = tb.replay_id and p.turn_number = tb.turn_number
      where p.toy is not null ${z}
      group by tb.turn_id, p.toy, tb.outcome, p.side
    )
    select
      (select count(*) from turns_base) as total_games,
      (select coalesce(json_agg(row_to_json(cps)), '[]'::json) from (
        select
          pr.pack as pack,
          count(*)::int as games,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws
        from pack_rounds pr
        group by pr.pack
        order by pr.pack
      ) cps) as pack_stats,
      (select coalesce(json_agg(row_to_json(pet_stats)), '[]'::json) from (
        select
          pr.pet_name as pet_name,
          count(*)::int as games_with,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws_with
        from pet_rounds pr
        group by pr.pet_name
        order by count(*) desc, pr.pet_name asc
        limit 50
      ) pet_stats) as pet_stats,
      (select coalesce(json_agg(row_to_json(perk_stats)), '[]'::json) from (
        select
          pr.perk_name as perk_name,
          count(*)::int as games_with,
          sum(case
            when pr.side = 'player' and pr.outcome = 1 then 1
            when pr.side = 'opponent' and pr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when pr.outcome = 3 then 1 else 0 end)::int as draws_with
        from perk_rounds pr
        group by pr.perk_name
        order by count(*) desc, pr.perk_name asc
        limit 50
      ) perk_stats) as perk_stats,
      (select coalesce(json_agg(row_to_json(toy_stats)), '[]'::json) from (
        select
          tr.toy_name as toy_name,
          count(*)::int as games_with,
          sum(case
            when tr.side = 'player' and tr.outcome = 1 then 1
            when tr.side = 'opponent' and tr.outcome = 2 then 1
            else 0
          end)::int as wins_with,
          sum(case when tr.outcome = 3 then 1 else 0 end)::int as draws_with
        from toy_rounds tr
        group by tr.toy_name
        order by count(*) desc, tr.toy_name asc
        limit 50
      ) toy_stats) as toy_stats
  `,O="battle"===s?N:M,P=u.slice(),Q=(a,b)=>{if(!b||!O.includes(a))return;let c=P.length+1,d=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");O=O.replace(RegExp(d,"g"),`$${c}`),P.push(b)};if(i){let a=P.length+1;O=O.replace(/\$PET_LEVEL/g,`$${a}`),P.push(Number(i))}else O=O.replace(/and p\.level = \$PET_LEVEL/g,"");if(g.length){let a=P.length+1;O=O.replace(/\$PET/g,`$${a}`),P.push(g)}else O=(O=O.replace(/and p\.pet_name = \$PET/g,"")).replace(/and p\.pet_name = any\(\$PET\)/g,"");if(j.length){let a=P.length+1;O=O.replace(/\$PERK/g,`$${a}`),P.push(j)}else O=(O=O.replace(/and p\.perk = \$PERK/g,"")).replace(/and p\.perk = any\(\$PERK\)/g,"");if(k.length){let a=P.length+1;O=O.replace(/\$TOY/g,`$${a}`),P.push(k)}else O=(O=O.replace(/and p\.toy = \$TOY/g,"")).replace(/and p\.toy = any\(\$TOY\)/g,"");Q("$ALLY_PET",m.length?m:null),Q("$OPP_PET",n.length?n:null),Q("$ALLY_PERK",o.length?o:null),Q("$OPP_PERK",p.length?p:null),Q("$ALLY_TOY",q.length?q:null),Q("$OPP_TOY",r.length?r:null);let{rows:R}=await f.d.query(O,P),S=R[0]||{total_games:0,pack_stats:[],pet_stats:[]};return e.NextResponse.json({totalGames:Number(S.total_games||0),packStats:S.pack_stats||[],petStats:S.pet_stats||[],perkStats:S.perk_stats||[],toyStats:S.toy_stats||[]},{headers:{"Cache-Control":"public, max-age=60, s-maxage=120, stale-while-revalidate=300"}})}d()}catch(a){d(a)}})}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[331,692],()=>b(b.s=4287));module.exports=c})();