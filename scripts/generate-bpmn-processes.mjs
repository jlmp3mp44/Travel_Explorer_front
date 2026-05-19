/**
 * Generates bpmn-app-processes.drawio.xml — one Draw.io file, 16 diagram tabs.
 * Run: node scripts/generate-bpmn-processes.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "bpmn-app-processes.drawio.xml");

const START =
  'strokeWidth=2;html=1;shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;outline=standard;symbol=message;fillColor=#dae8fc;strokeColor=#6c8ebf;verticalLabelPosition=bottom;verticalAlign=top;align=center;fontSize=10;';
const TASK =
  "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=10;strokeWidth=2;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=10;";
const TASK_BE =
  "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=10;strokeWidth=2;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=10;";
const TASK_ERR =
  "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=10;strokeWidth=2;fillColor=#f8cecc;strokeColor=#b85450;fontSize=10;";
const TASK_OK =
  "rounded=1;whiteSpace=wrap;html=1;absoluteArcSize=1;arcSize=10;strokeWidth=2;fillColor=#d5e8d4;strokeColor=#82b366;fontSize=10;";
const GW =
  "strokeWidth=2;html=1;shape=mxgraph.bpmn.gateway2;perimeter=rhombusPerimeter;outlineConnect=0;outline=none;symbol=none;gwType=exclusive;fillColor=#ffe6cc;strokeColor=#d79b00;fontSize=10;verticalLabelPosition=bottom;verticalAlign=top;align=center;";
const END =
  "strokeWidth=3;html=1;shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;outline=end;symbol=none;fillColor=#f8cecc;strokeColor=#b85450;";
const END_OK =
  "strokeWidth=3;html=1;shape=mxgraph.bpmn.event;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;outline=end;symbol=none;fillColor=#d5e8d4;strokeColor=#82b366;";
const SF = "endArrow=blockThin;endFill=1;endSize=8;html=1;rounded=0;strokeWidth=2;";
const MF =
  "dashed=1;dashPattern=8 4;endArrow=blockThin;endFill=1;startArrow=oval;startFill=0;endSize=6;startSize=4;rounded=0;html=1;strokeWidth=2;fontSize=9;";

let cellId = 0;
function nid(prefix = "c") {
  return `${prefix}-${++cellId}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} p
 * @param {string} p.id diagram id
 * @param {string} p.name tab name
 * @param {string} p.poolTitle
 * @param {Array<{id:string,value:string,style?:string,x:number,y:number,w?:number,h?:number,parent?:string}>} p.nodes
 * @param {Array<{id:string,source:string,target:string,value?:string,parent?:string,points?:Array<{x:number,y:number}>}>} p.edges
 * @param {Array<{id:string,source:string,target:string,value?:string,points?:Array<{x:number,y:number}>}>} p.messages
 */
function buildDiagram({ id, name, poolTitle, nodes, edges, messages = [] }) {
  const parts = [];
  const rootId = nid("root");
  parts.push(`  <diagram id="${esc(id)}" name="${esc(name)}">`);
  parts.push(
    `    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1000" pageHeight="520" math="0" shadow="0">`
  );
  parts.push("      <root>");
  parts.push(`        <mxCell id="${rootId}-0" />`);
  parts.push(`        <mxCell id="${rootId}-1" parent="${rootId}-0" />`);

  const laneFe = nid("fe");
  const laneBe = nid("be");
  const mainPool = nid("pool");
  const userPool = nid("user");

  parts.push(
    `        <mxCell id="${userPool}" value="User" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=28;fillColor=#f5f5f5;strokeColor=#666666;fontSize=11;" vertex="1" parent="${rootId}-1">`,
    `          <mxGeometry x="30" y="20" width="900" height="48" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${mainPool}" value="${esc(poolTitle)}" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;childLayout=stackLayout;resizeParent=1;resizeParentMax=0;startSize=28;horizontalStack=0;fillColor=#ffffff;fontStyle=1;strokeColor=#666666;fontSize=11;" vertex="1" parent="${rootId}-1">`,
    `          <mxGeometry x="30" y="78" width="900" height="380" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${laneFe}" value="Front-end" style="swimlane;whiteSpace=wrap;html=1;startSize=24;horizontal=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=10;" vertex="1" parent="${mainPool}">`,
    `          <mxGeometry y="28" width="900" height="176" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${laneBe}" value="Back-end (mock)" style="swimlane;whiteSpace=wrap;html=1;startSize=24;horizontal=0;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=10;" vertex="1" parent="${mainPool}">`,
    `          <mxGeometry y="204" width="900" height="176" as="geometry" />`,
    `        </mxCell>`
  );

  const parentMap = { fe: laneFe, be: laneBe, root: `${rootId}-1` };

  for (const n of nodes) {
    const parent = parentMap[n.lane] || n.parent || laneFe;
    const style = n.style || TASK;
    const w = n.w ?? 160;
    const h = n.h ?? 52;
    parts.push(
      `        <mxCell id="${n.id}" value="${esc(n.value)}" style="${style}" vertex="1" parent="${parent}">`,
      `          <mxGeometry x="${n.x}" y="${n.y}" width="${w}" height="${h}" as="geometry" />`,
      `        </mxCell>`
    );
  }

  for (const e of edges) {
    const parent = e.parent ? parentMap[e.parent] || e.parent : laneFe;
    const pts =
      e.points && e.points.length
        ? `\n            <Array as="points">\n${e.points
            .map((p) => `              <mxPoint x="${p.x}" y="${p.y}" />`)
            .join("\n")}\n            </Array>`
        : "";
    const val = e.value ? ` value="${esc(e.value)}"` : "";
    parts.push(
      `        <mxCell id="${e.id}"${val} style="${SF}${e.value ? "fontStyle=1;" : ""}" edge="1" parent="${parent}" source="${e.source}" target="${e.target}">`,
      `          <mxGeometry relative="1" as="geometry">${pts}`,
      `          </mxGeometry>`,
      `        </mxCell>`
    );
  }

  for (const m of messages) {
    const pts =
      m.points && m.points.length
        ? `\n            <Array as="points">\n${m.points
            .map((p) => `              <mxPoint x="${p.x}" y="${p.y}" />`)
            .join("\n")}\n            </Array>`
        : "";
    const val = m.value ? ` value="${esc(m.value)}"` : "";
    parts.push(
      `        <mxCell id="${m.id}"${val} style="${MF}" edge="1" parent="${rootId}-1" source="${m.source}" target="${m.target}">`,
      `          <mxGeometry relative="1" as="geometry">${pts}`,
      `          </mxGeometry>`,
      `        </mxCell>`
    );
  }

  parts.push("      </root>");
  parts.push("    </mxGraphModel>");
  parts.push("  </diagram>");
  return parts.join("\n");
}

/** Linear FE -> BE -> FE success flow */
function linearFlow(prefix, { start, validate, gw, errTask, beTask, gwBe, beErr, feErr, success, endErr, endOk, beErrLabel = "No", crossY = 290 }) {
  const ids = {
    start: `${prefix}-start`,
    validate: `${prefix}-val`,
    gw: `${prefix}-gw`,
    err: `${prefix}-err`,
    endErr: `${prefix}-end-err`,
    be: `${prefix}-be`,
    gwBe: `${prefix}-gw-be`,
    beErr: `${prefix}-be-err`,
    feErr: `${prefix}-fe-err`,
    endFeErr: `${prefix}-end-fe-err`,
    ok: `${prefix}-ok`,
    endOk: `${prefix}-end-ok`,
    user: `${prefix}-user`,
  };
  return {
    nodes: [
      { id: ids.start, value: start, style: START, lane: "fe", x: 40, y: 58, w: 40, h: 40 },
      { id: ids.validate, value: validate, lane: "fe", x: 120, y: 48, w: 170, h: 56 },
      { id: ids.gw, value: gw, style: GW, lane: "fe", x: 330, y: 53, w: 44, h: 44 },
      { id: ids.err, value: errTask, style: TASK_ERR, lane: "fe", x: 430, y: 22, w: 150, h: 48 },
      { id: ids.endErr, value: "", style: END, lane: "fe", x: 620, y: 30, w: 32, h: 32 },
      { id: ids.be, value: beTask, style: TASK_BE, lane: "be", x: 300, y: 40, w: 220, h: 64 },
      { id: ids.gwBe, value: gwBe, style: GW, lane: "be", x: 560, y: 50, w: 44, h: 44 },
      { id: ids.beErr, value: beErr, style: TASK_ERR, lane: "be", x: 520, y: 118, w: 180, h: 48 },
      { id: ids.feErr, value: feErr, style: TASK_ERR, lane: "fe", x: 430, y: 108, w: 170, h: 48 },
      { id: ids.endFeErr, value: "", style: END, lane: "fe", x: 650, y: 116, w: 32, h: 32 },
      { id: ids.ok, value: success, style: TASK_OK, lane: "fe", x: 700, y: 48, w: 170, h: 56 },
      { id: ids.endOk, value: "", style: END_OK, lane: "fe", x: 900, y: 58, w: 32, h: 32 },
    ],
    edges: [
      { id: `${prefix}-e1`, source: ids.start, target: ids.validate },
      { id: `${prefix}-e2`, source: ids.validate, target: ids.gw },
      { id: `${prefix}-e3`, source: ids.gw, target: ids.err, value: "No" },
      { id: `${prefix}-e4`, source: ids.err, target: ids.endErr },
      {
        id: `${prefix}-e5`,
        source: ids.gw,
        target: ids.be,
        value: "Yes",
        parent: "pool",
        points: [
          { x: 352, y: crossY },
          { x: 410, y: crossY },
        ],
      },
      { id: `${prefix}-e6`, source: ids.be, target: ids.gwBe, parent: "be" },
      { id: `${prefix}-e7`, source: ids.gwBe, target: ids.beErr, value: beErrLabel, parent: "be" },
      {
        id: `${prefix}-e8`,
        source: ids.beErr,
        target: ids.feErr,
        parent: "pool",
        points: [
          { x: 610, y: 360 },
          { x: 610, y: 230 },
        ],
      },
      { id: `${prefix}-e9`, source: ids.feErr, target: ids.endFeErr },
      {
        id: `${prefix}-e10`,
        source: ids.gwBe,
        target: ids.ok,
        value: "Yes",
        parent: "pool",
        points: [
          { x: 680, y: crossY - 10 },
          { x: 800, y: crossY - 10 },
          { x: 800, y: 170 },
        ],
      },
      { id: `${prefix}-e11`, source: ids.ok, target: ids.endOk },
    ],
    messages: [
      { id: `${prefix}-m1`, source: "USER_REF", target: ids.start, value: "Action" },
      { id: `${prefix}-m2`, source: ids.err, target: "USER_REF", value: "Error" },
      { id: `${prefix}-m3`, source: ids.feErr, target: "USER_REF", value: "Error" },
      { id: `${prefix}-m4`, source: ids.ok, target: "USER_REF", value: "Done" },
    ],
    ids,
  };
}

const diagrams = [];

function addDiagram(spec) {
  diagrams.push(spec);
}

// 1 Create trip
addDiagram({
  id: "01-create-trip",
  name: "01 Create trip",
  poolTitle: "Create trip",
  ...(() => {
    const f = linearFlow("ct", {
      start: "Fill trip wizard&#xa;(country, city, dates, interests, budget)",
      validate: "Validate form&#xa;(required fields, dates, selections)",
      gw: "Valid?",
      errTask: "Show validation error",
      beTask: "[MOCK] POST /api/public/trips&#xa;Generate itinerary",
      gwBe: "Created?",
      beErr: "Return error (4xx/5xx)",
      feErr: "Show create error",
      success: "Save snapshot, navigate&#xa;to /trip/:id",
    });
    f.nodes.splice(4, 0, {
      id: "ct-prompt",
      value: "Optional: prompt to include&#xa;matching interesting places",
      lane: "fe",
      x: 310,
      y: 108,
      w: 180,
      h: 48,
      style: TASK,
    });
    return f;
  })(),
});

// Fix USER_REF in messages - we'll patch user pool id per diagram in build

// Simpler approach: define each diagram explicitly with unique ids

const PROCESSES = [
  {
    id: "01-create-trip",
    name: "01 Create trip",
    pool: "Create trip",
    start: "Fill trip wizard&#xa;(country, city, dates, budget, interests)",
    validate: "Validate form data",
    gw: "Valid?",
    err: "Show validation error",
    be: "[MOCK] POST /api/public/trips&#xa;(optional mustIncludePlaceIds)",
    gwBe: "Created?",
    beErr: "Return error response",
    feErr: "Show friendlyTripCreateError",
    ok: "Cache snapshot, navigate to /trip/:id",
  },
  {
    id: "02-profile-info",
    name: "02 Profile info",
    pool: "View / edit profile",
    start: "Open /profile page",
    validate: "Load user from AuthContext&#xa;(GET /api/user on app load)",
    gw: "Signed in?",
    err: "Redirect to /login",
    be: "[MOCK] PUT /api/user&#xa;(e.g. phoneNumber)",
    gwBe: "Saved?",
    beErr: "Return error",
    feErr: "Show profile error",
    ok: "refreshUser(), show saved message",
    auth: true,
  },
  {
    id: "03-logout",
    name: "03 Logout",
    pool: "Sign out",
    start: "Click Sign out",
    validate: "Confirm sign out (dialog)",
    gw: "Confirmed?",
    err: "Cancel — stay signed in",
    be: "[MOCK] POST /api/auth/signout&#xa;Clear session cookie",
    gwBe: "OK?",
    beErr: "Network error (ignored)",
    feErr: "Clear user state anyway",
    ok: "Clear AuthContext, navigate to /",
  },
  {
    id: "04-delete-trip",
    name: "04 Delete trip",
    pool: "Delete trip",
    start: "Request delete trip",
    validate: "Confirm deletion (inline/modal)",
    gw: "Confirmed?",
    err: "Cancel",
    be: "[MOCK] DELETE /api/public/trips/:id",
    gwBe: "Deleted?",
    beErr: "Return error",
    feErr: "Show action error",
    ok: "Remove from list, redirect /&#xa;(tripDeleted flash)",
  },
  {
    id: "05-view-trip",
    name: "05 View trip details",
    pool: "View trip info",
    start: "Open /trip/:id",
    validate: "Read id from URL,&#xa;check auth for ratings",
    gw: "Valid id?",
    err: "Show not found / error",
    be: "[MOCK] GET /api/public/trips/:id&#xa;?userId= for preferences",
    gwBe: "Found?",
    beErr: "404 / 5xx",
    feErr: "Show load error",
    ok: "Render itinerary, map, ratings UI",
    viewOnly: true,
  },
  {
    id: "06-delete-activity",
    name: "06 Delete activity",
    pool: "Delete activity from trip",
    start: "Owner: Delete activity",
    validate: "Pick reason&#xa;(WAS_HERE / DONT_WANT_TO_GO)",
    gw: "Owner &amp; reason?",
    err: "Prompt sign in / cancel",
    be: "[MOCK] DELETE .../activities/:id&#xa;body: { reason }",
    gwBe: "OK?",
    beErr: "Return error",
    feErr: "Show action error",
    ok: "Update trip UI / Save changes batch",
  },
  {
    id: "07-replace-activity-auto",
    name: "07 Replace activity (system)",
    pool: "Replace activity — system pick",
    start: "Owner: Replace with suggestion",
    validate: "Pick reason (modal),&#xa;choose system replace",
    gw: "Ready?",
    err: "Cancel",
    be: "[MOCK] POST .../replace-smart&#xa;{ reason }",
    gwBe: "OK?",
    beErr: "Return error",
    feErr: "Show replacement error",
    ok: "Show new activity in itinerary",
  },
  {
    id: "08-replace-activity-manual",
    name: "08 Replace activity (manual)",
    pool: "Replace activity — manual place",
    start: "Owner: Replace, search place",
    validate: "Pick reason, search, select place",
    gw: "Place selected?",
    err: "Show search error / cancel",
    be: "[MOCK] POST .../replace-with-place&#xa;{ placeId, reason }",
    gwBe: "OK?",
    beErr: "Return error",
    feErr: "Show apply error",
    ok: "Update activity in trip view",
  },
  {
    id: "09-add-activity-auto",
    name: "09 Add activity (system)",
    pool: "Add activity — auto",
    start: "Owner: Add stop (auto)",
    validate: "Select day, open add panel",
    gw: "Owner signed in?",
    err: "Redirect to login",
    be: "[MOCK] POST .../days/:dayId/activities&#xa;(no body — auto pick)",
    gwBe: "OK?",
    beErr: "Return error",
    feErr: "Show add error",
    ok: "Append activity to day",
  },
  {
    id: "10-add-activity-manual",
    name: "10 Add activity (manual)",
    pool: "Add activity — manual",
    start: "Owner: Add stop (manual)",
    validate: "Search trip places, pick place",
    gw: "Place selected?",
    err: "Search failed / cancel",
    be: "[MOCK] POST .../activities&#xa;{ placeId }",
    gwBe: "OK?",
    beErr: "Return error",
    feErr: "Show add error",
    ok: "Append activity to day",
  },
  {
    id: "11-rate-trip",
    name: "11 Rate trip",
    pool: "Rate trip",
    start: "User selects trip stars (1–5)",
    validate: "Signed in? trip id present",
    gw: "Can rate?",
    err: "Link to sign in",
    be: "[MOCK] POST .../trips/:id/ratings&#xa;{ userId, stars }",
    gwBe: "Saved?",
    beErr: "Return error",
    feErr: "Show rating error",
    ok: "refetchTrip + localStorage cache",
  },
  {
    id: "12-rate-activity",
    name: "12 Rate activity",
    pool: "Rate activity",
    start: "User selects activity stars",
    validate: "Signed in? activity id present",
    gw: "Can rate?",
    err: "Link to sign in",
    be: "[MOCK] POST .../activities/:id/ratings",
    gwBe: "Saved?",
    beErr: "Return error",
    feErr: "Show rating error",
    ok: "refetchTrip + localStorage cache",
  },
  {
    id: "13-discover-filters",
    name: "13 Discover filters",
    pool: "Discover — filter trips",
    start: "Set country and/or&#xa;category filters, Apply",
    validate: "Build query params&#xa;(countryName, categoryCodes)",
    gw: "Filters valid?",
    err: "Show countries load error",
    be: "[MOCK] GET /api/public/trips?...&#xa;page 0, public trips only",
    gwBe: "OK?",
    beErr: "5xx / load error",
    feErr: "Show friendlyNetworkError",
    ok: "Display filtered trip cards",
    public: true,
  },
  {
    id: "14-add-interesting-place",
    name: "14 Add interesting place",
    pool: "Save interesting place",
    start: "Search place (city/country + text)",
    validate: "Select result to save",
    gw: "Signed in?",
    err: "Redirect to /login",
    be: "[MOCK] POST /api/user/interesting-places&#xa;{ placeId, cityId, countryId }",
    gwBe: "Saved?",
    beErr: "Duplicate / validation error",
    feErr: "Show save error",
    ok: "Refresh saved places list",
  },
  {
    id: "15-export-pdf",
    name: "15 Export trip PDF",
    pool: "Export trip as PDF",
    start: "Click Download PDF",
    validate: "trip.id present",
    gw: "Ready?",
    err: "Disable button while loading",
    be: "[MOCK] GET .../trips/:id/pdf&#xa;?largePhotos=true",
    gwBe: "PDF ready?",
    beErr: "Return error",
    feErr: "Show download error",
    ok: "Blob download via&#xa;Content-Disposition filename",
  },
  {
    id: "16-reorder-activities",
    name: "16 Reorder activities",
    pool: "Reorder day activities",
    start: "Owner: drag-and-drop stops",
    validate: "Reorder within same day",
    gw: "Owner?",
    err: "Not allowed",
    be: "[MOCK] PUT .../days/:dayId/activities/order&#xa;[activityIds]",
    gwBe: "Saved?",
    beErr: "Return error",
    feErr: "Revert / show error on Save",
    ok: "Persist order (Save changes) or immediate API",
  },
];

function buildProcessDiagram(p) {
  cellId = 0;
  const prefix = p.id.replace(/[^a-z0-9]/gi, "").slice(0, 6);
  const userPool = nid("user");
  const mainPool = nid("pool");
  const laneFe = nid("fe");
  const laneBe = nid("be");

  const ids = {
    start: nid("st"),
    validate: nid("val"),
    gw: nid("gw"),
    err: nid("err"),
    endErr: nid("eer"),
    be: nid("be"),
    gwBe: nid("gwb"),
    beErr: nid("ber"),
    feErr: nid("fer"),
    endFeErr: nid("efr"),
    ok: nid("ok"),
    endOk: nid("eok"),
  };

  const nodes = [
    { id: ids.start, value: p.start, style: START, lane: "fe", x: 36, y: 56, w: 40, h: 40 },
    { id: ids.validate, value: p.validate, lane: "fe", x: 110, y: 46, w: 168, h: 54 },
    { id: ids.gw, value: p.gw, style: GW, lane: "fe", x: 318, y: 51, w: 42, h: 42 },
    { id: ids.err, value: p.err, style: TASK_ERR, lane: "fe", x: 410, y: 20, w: 148, h: 46 },
    { id: ids.endErr, value: "", style: END, lane: "fe", x: 590, y: 28, w: 30, h: 30 },
    { id: ids.be, value: p.be, style: TASK_BE, lane: "be", x: 290, y: 38, w: 210, h: 62 },
    { id: ids.gwBe, value: p.gwBe, style: GW, lane: "be", x: 540, y: 48, w: 42, h: 42 },
    { id: ids.beErr, value: p.beErr, style: TASK_ERR, lane: "be", x: 500, y: 112, w: 175, h: 46 },
    { id: ids.feErr, value: p.feErr, style: TASK_ERR, lane: "fe", x: 410, y: 104, w: 165, h: 46 },
    { id: ids.endFeErr, value: "", style: END, lane: "fe", x: 620, y: 112, w: 30, h: 30 },
    { id: ids.ok, value: p.ok, style: TASK_OK, lane: "fe", x: 680, y: 46, w: 168, h: 54 },
    { id: ids.endOk, value: "", style: END_OK, lane: "fe", x: 870, y: 56, w: 30, h: 30 },
  ];

  const edges = [
    { id: nid("e"), source: ids.start, target: ids.validate },
    { id: nid("e"), source: ids.validate, target: ids.gw },
    { id: nid("e"), source: ids.gw, target: ids.err, value: "No" },
    { id: nid("e"), source: ids.err, target: ids.endErr },
    {
      id: nid("e"),
      source: ids.gw,
      target: ids.be,
      value: "Yes",
      parent: mainPool,
      points: [
        { x: 339, y: 285 },
        { x: 395, y: 285 },
      ],
    },
    { id: nid("e"), source: ids.be, target: ids.gwBe, parent: laneBe },
    { id: nid("e"), source: ids.gwBe, target: ids.beErr, value: "No", parent: laneBe },
    {
      id: nid("e"),
      source: ids.beErr,
      target: ids.feErr,
      parent: mainPool,
      points: [
        { x: 587, y: 355 },
        { x: 587, y: 225 },
      ],
    },
    { id: nid("e"), source: ids.feErr, target: ids.endFeErr },
    {
      id: nid("e"),
      source: ids.gwBe,
      target: ids.ok,
      value: "Yes",
      parent: mainPool,
      points: [
        { x: 650, y: 275 },
        { x: 780, y: 275 },
        { x: 780, y: 168 },
      ],
    },
    { id: nid("e"), source: ids.ok, target: ids.endOk },
  ];

  const messages = [
    { id: nid("m"), source: userPool, target: ids.start, value: "User action" },
    { id: nid("m"), source: ids.err, target: userPool, value: "Feedback" },
    { id: nid("m"), source: ids.feErr, target: userPool, value: "Error" },
    { id: nid("m"), source: ids.ok, target: userPool, value: "Result" },
  ];

  const parts = [];
  parts.push(`  <diagram id="${esc(p.id)}" name="${esc(p.name)}">`);
  parts.push(
    `    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="960" pageHeight="500" math="0" shadow="0">`
  );
  parts.push("      <root>");
  parts.push(`        <mxCell id="${prefix}-0" />`);
  parts.push(`        <mxCell id="${prefix}-1" parent="${prefix}-0" />`);
  parts.push(
    `        <mxCell id="${userPool}" value="User" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=26;fillColor=#f5f5f5;strokeColor=#666666;fontSize=10;" vertex="1" parent="${prefix}-1">`,
    `          <mxGeometry x="24" y="16" width="880" height="44" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${mainPool}" value="${esc(p.pool)}" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;childLayout=stackLayout;resizeParent=1;resizeParentMax=0;startSize=26;horizontalStack=0;fillColor=#ffffff;fontStyle=1;strokeColor=#666666;fontSize=10;" vertex="1" parent="${prefix}-1">`,
    `          <mxGeometry x="24" y="68" width="880" height="360" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${laneFe}" value="Front-end" style="swimlane;whiteSpace=wrap;html=1;startSize=22;horizontal=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;fontSize=9;" vertex="1" parent="${mainPool}">`,
    `          <mxGeometry y="26" width="880" height="167" as="geometry" />`,
    `        </mxCell>`
  );
  parts.push(
    `        <mxCell id="${laneBe}" value="Back-end (mock)" style="swimlane;whiteSpace=wrap;html=1;startSize=22;horizontal=0;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=9;" vertex="1" parent="${mainPool}">`,
    `          <mxGeometry y="193" width="880" height="167" as="geometry" />`,
    `        </mxCell>`
  );

  const laneMap = { fe: laneFe, be: laneBe };
  for (const n of nodes) {
    const par = laneMap[n.lane] || laneFe;
    const style = n.style || TASK;
    parts.push(
      `        <mxCell id="${n.id}" value="${esc(n.value)}" style="${style}" vertex="1" parent="${par}">`,
      `          <mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry" />`,
      `        </mxCell>`
    );
  }

  for (const e of edges) {
    const par = e.parent === mainPool ? mainPool : e.parent === laneBe ? laneBe : laneFe;
    const val = e.value ? ` value="${esc(e.value)}"` : "";
    const pts =
      e.points && e.points.length
        ? `<Array as="points">${e.points.map((pt) => `<mxPoint x="${pt.x}" y="${pt.y}" />`).join("")}</Array>`
        : "";
    parts.push(
      `        <mxCell id="${e.id}"${val} style="${SF}${e.value ? "fontStyle=1;" : ""}" edge="1" parent="${par}" source="${e.source}" target="${e.target}">`,
      `          <mxGeometry relative="1" as="geometry">${pts}</mxGeometry>`,
      `        </mxCell>`
    );
  }

  for (const m of messages) {
    const val = m.value ? ` value="${esc(m.value)}"` : "";
    parts.push(
      `        <mxCell id="${m.id}"${val} style="${MF}" edge="1" parent="${prefix}-1" source="${m.source}" target="${m.target}">`,
      `          <mxGeometry relative="1" as="geometry" />`,
      `        </mxCell>`
    );
  }

  parts.push("      </root>");
  parts.push("    </mxGraphModel>");
  parts.push("  </diagram>");
  return parts.join("\n");
}

const body = PROCESSES.map(buildProcessDiagram).join("\n");
const xml = `<mxfile host="app.diagrams.net" modified="2026-05-19T00:00:00.000Z" agent="Cursor" version="22.1.0" type="device">\n${body}\n</mxfile>\n`;

writeFileSync(OUT, xml, "utf8");
console.log(`Wrote ${OUT} (${PROCESSES.length} diagrams)`);
