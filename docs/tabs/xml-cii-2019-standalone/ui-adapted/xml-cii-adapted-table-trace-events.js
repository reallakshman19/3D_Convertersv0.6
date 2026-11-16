/**
 * Event handlers for CSV/XLS trace import inside the JSON Trace phase.
 * Inputs: DOM controls and workflow state refs. Outputs: parsed rows, field
 * map updates, resolver-shaped table trace results, and benchmark summaries.
 * Fallback: status text records parse/build issues without changing JSON data.
 */
import {
  autoMapTraceTableFields,
  buildTraceTableResolverResult,
  compareTraceResultsByComponentRef,
  headersFromTraceRows,
  parseTraceTableText,
  rowsToTraceTableText,
} from '../xml-cii-table-trace-source.js';
import { REQUIRED_TRACE_TABLE_FIELD_NAMES } from '../xml-cii-table-trace-table.js';
import {buildStagedJsonTraceSidecar,compareStagedJsonTraceSidecar,sidecarConfigForTraceResult,traceMemberAssignments,compareSidecarXmlAssignments} from '../xml-cii-staged-json-trace-sidecar.js';
import {runStandaloneResolverJsonTrace} from '../xml-cii-resolver-json-trace.js';
import {compareCurrentLfjO1Sidecar} from './xml-cii-adapted-lfj-o1-domain-ui.js';
import {
  activeProfileFor,
  normalizeTraceTableConfig,
} from '../xml-cii-table-trace-config.js';
import { updateWorkflowState } from './xml-cii-adapted-state.js?v=20261001-weight-output-2';

const REQUIRED_TABLE_FIELD_NAMES = REQUIRED_TRACE_TABLE_FIELD_NAMES;

async function getXlsxModule() {
  if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') return XLSX;
  const mod = await import('xlsx');
  if (mod && typeof mod.read === 'function') return mod;
  if (mod?.default && typeof mod.default.read === 'function') return mod.default;
  throw new Error('xlsx module could not be loaded.');
}

function isWorkbookName(fileName) {
  return /\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(String(fileName || ''));
}

function sheetRows(workbook, xlsx, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false })
    .map((row, index) => ({ _rowIndex: index + 2, ...row }));
}

async function parseTraceFile(file) {
  const buffer = await file.arrayBuffer();
  if (!isWorkbookName(file.name)) {
    const tableText = new TextDecoder('utf-8').decode(buffer);
    return { tableText, rows: parseTraceTableText(tableText), sheetNames: [], activeSheet: '', workbookData: null };
  }
  const XLSX = await getXlsxModule();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false, raw: false });
  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) throw new Error('Workbook contains no sheets.');
  const workbookData = {};
  for (const name of sheetNames) workbookData[name] = sheetRows(workbook, XLSX, name);
  const activeSheet = sheetNames[0];
  const rows = workbookData[activeSheet] || [];
  return { tableText: rowsToTraceTableText(rows), rows, sheetNames, activeSheet, workbookData };
}

const isSidecar=rows=>rows?.some(row=>['JSON source path','JSON ordinal','Source attributes JSON','Source member JSON'].some(key=>Object.hasOwn(row,key)));
function buildFieldMap(rows, previousMap, traceConfig) {
  const headers = headersFromTraceRows(rows);
  if (!isSidecar(rows) && previousMap && REQUIRED_TABLE_FIELD_NAMES.every((fieldName) => previousMap[fieldName] && headers.includes(previousMap[fieldName]))) return previousMap;
  return autoMapTraceTableFields(headers, rows, traceConfig);
}

function applyRowsToState(state, rows, tableText, sourceName, extra) {
  const traceConfig = normalizeTraceTableConfig(state.jsonTraceTableConfig);
  const fieldMap = buildFieldMap(rows, state.jsonTraceTableFieldMap, traceConfig);
  const profile = activeProfileFor(headersFromTraceRows(rows), traceConfig);
  return updateWorkflowState(state, {
    ...extra,
    jsonTraceTableRows: rows,
    jsonTraceTableText: tableText,
    jsonTraceTableFieldMap: fieldMap,
    jsonTraceTableConfig: traceConfig,
    jsonTraceTableSourceName: sourceName,
    resolverJsonTraceTableResult:null,jsonTraceTableBenchmark:null,
    jsonTraceTableStatus: `Parsed ${rows.length} table row(s). Profile ${profile.label} (${profile.confidence}%). Review mapping before building trace.`,
  });
}

function currentJsonResult(state) {
  if (state.resolverJsonTraceJsonResult) return state.resolverJsonTraceJsonResult;
  return state.resolverJsonTraceResult?.sourceKind === 'table' ? null : state.resolverJsonTraceResult;
}

function benchmarkFor(state, tableResult) {
  const jsonResult = currentJsonResult(state);
  return !isSidecar(tableResult.rawRows)&&jsonResult ? compareTraceResultsByComponentRef(jsonResult, tableResult) : null;
}

function buildTableTraceState(state) {
  const rawRows = state.jsonTraceTableRows?.length ? state.jsonTraceTableRows : parseTraceTableText(state.jsonTraceTableText || '');
  const traceConfig = normalizeTraceTableConfig(state.jsonTraceTableConfig);
  const tableResult = buildTraceTableResolverResult({
    sourceText: state.sourceText || '',
    rawRows,
    fieldMap: state.jsonTraceTableFieldMap || {},
    traceConfig,
  });
  const benchmark = benchmarkFor(state, tableResult);
  const matched = tableResult.matchedFacts.length;
  const rejected = tableResult.rejectedFacts.length;
  const groups = tableResult.traceConfig.coordinateGroupCount || 0;
  const suffix = benchmark ? ` Benchmark ${benchmark.matched}/${benchmark.compared} (${benchmark.percent.toFixed(2)}%).` : '';
  return updateWorkflowState(state, {
    jsonTraceTableRows: rawRows,
    jsonTraceTableFieldMap: tableResult.fieldMap,
    jsonTraceTableConfig: traceConfig,
    resolverJsonTraceTableResult: tableResult,
    resolverJsonTraceResult: tableResult,
    jsonTraceTableBenchmark: benchmark,
    jsonTraceTableStatus: `Table trace built: ${matched} matched XML nodes, ${rejected} rejected, ${groups} coordinate groups.${suffix}`,
    result: null,
  });
}

async function compareSidecarState(stateRef,render){
  const state=stateRef.current,table=state.resolverJsonTraceTableResult;
  if(!table||!isSidecar(table.rawRows))return false;
  try{
    let benchmark=await compareCurrentLfjO1Sidecar(stateRef,table.rawRows,traceMemberAssignments(table));
    if(!benchmark){
      // Never parse the indexed O1 source on the main thread or use stale
      // cached trace output as a substitute for the original source.
      if(state.xml229StagedSourceReceipt)throw Error('Build current O1 JSON trace before comparing.');
      const staged=state.stagedJsonText||await state.stagedJsonFile?.text?.();
      if(!staged)throw Error('Load the original staged JSON before comparing.');
      const jsonResult=runStandaloneResolverJsonTrace({...state,stagedJsonText:staged,jsonConfig:state.resolverJsonTraceConfig});
      const source=buildStagedJsonTraceSidecar(staged,sidecarConfigForTraceResult(jsonResult,state.resolverJsonTraceConfig));
      benchmark=compareStagedJsonTraceSidecar(source.memberRows,table.rawRows);
      benchmark.xmlAssignments=compareSidecarXmlAssignments(traceMemberAssignments(jsonResult),traceMemberAssignments(table));
    }
    if(stateRef.current!==state)return true;
    stateRef.current=updateWorkflowState(state,{jsonTraceTableBenchmark:benchmark,
      jsonTraceTableStatus:'Member round-trip: '+benchmark.matched+'/'+benchmark.compared+
        '; '+benchmark.mismatched+' differences. XML assignment differences: '+benchmark.xmlAssignments.mismatched+'.'});
  }catch(error){
    if(stateRef.current!==state)return true;
    stateRef.current=updateWorkflowState(state,{jsonTraceTableBenchmark:null,jsonTraceTableStatus:'Sidecar comparison unavailable: '+String(error.message||error)});
  }
  render();return true;
}

function compareTraceState(state) {
  const tableResult = state.resolverJsonTraceTableResult;
  const jsonResult = currentJsonResult(state);
  if (!tableResult || !jsonResult) {
    return updateWorkflowState(state, { jsonTraceTableStatus: 'Build both JSON resolver index and table trace before comparing.' });
  }
  const benchmark = compareTraceResultsByComponentRef(jsonResult, tableResult);
  return updateWorkflowState(state, {
    jsonTraceTableBenchmark: benchmark,
    jsonTraceTableStatus: `Benchmark ${benchmark.matched}/${benchmark.compared} (${benchmark.percent.toFixed(2)}%).`,
  });
}

function updateTextState(state, value) {
  const rows = parseTraceTableText(value);
  return applyRowsToState(state, rows, value, state.jsonTraceTableSourceName || 'pasted table', {});
}

function updateMapState(state, fieldName, header) {
  return updateWorkflowState(state, {
    jsonTraceTableFieldMap: { ...(state.jsonTraceTableFieldMap || {}), [fieldName]: header },
    resolverJsonTraceTableResult:null,jsonTraceTableBenchmark:null,
    jsonTraceTableStatus: `Mapped ${fieldName} -> ${header || '(none)'}.`,
  });
}

function rowsFromState(state) {
  return state.jsonTraceTableRows?.length ? state.jsonTraceTableRows : parseTraceTableText(state.jsonTraceTableText || '');
}

function updateTraceProfileState(state, profileId) {
  const rows = rowsFromState(state);
  const traceConfig = normalizeTraceTableConfig({ ...(state.jsonTraceTableConfig || {}), profileId });
  const headers = headersFromTraceRows(rows);
  const profile = activeProfileFor(headers, traceConfig);
  return updateWorkflowState(state, {
    jsonTraceTableRows: rows,
    jsonTraceTableConfig: traceConfig,
    jsonTraceTableFieldMap: autoMapTraceTableFields(headers, rows, traceConfig),
    resolverJsonTraceTableResult:null,jsonTraceTableBenchmark:null,
    jsonTraceTableStatus: `Trace profile set to ${profile.label}. Auto-mapped ${rows.length} row(s).`,
  });
}

function updateTraceConfigState(state, patch) {
  const traceConfig = normalizeTraceTableConfig({ ...(state.jsonTraceTableConfig || {}), ...patch });
  return updateWorkflowState(state, {
    jsonTraceTableConfig: traceConfig,
    resolverJsonTraceTableResult:null,jsonTraceTableBenchmark:null,
    jsonTraceTableStatus: 'Trace import configuration updated. Rebuild table trace to apply it.',
  });
}

function updateTraceRuleState(state, ruleId, enabled) {
  const current = normalizeTraceTableConfig(state.jsonTraceTableConfig);
  const matchRules = current.matchRules.map((rule) => (rule.id === ruleId ? { ...rule, enabled } : rule));
  return updateTraceConfigState(state, { matchRules });
}

export function bindTraceTableEvents(container, stateRef, render) {
  container.querySelector('[data-json-trace-table-file]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseTraceFile(file);
      stateRef.current = applyRowsToState(stateRef.current, parsed.rows, parsed.tableText, file.name, {
        jsonTraceTableSheetNames: parsed.sheetNames,
        jsonTraceTableActiveSheet: parsed.activeSheet,
        jsonTraceTableWorkbookData: parsed.workbookData,
      });
    } catch (error) {
      stateRef.current = updateWorkflowState(stateRef.current, { jsonTraceTableStatus: `Table parse error: ${error?.message || String(error)}` });
    }
    render();
  });

  container.querySelector('[data-json-trace-table-sheet]')?.addEventListener('change', (event) => {
    const sheetName = event.target.value;
    const rows = stateRef.current.jsonTraceTableWorkbookData?.[sheetName] || [];
    stateRef.current = applyRowsToState(stateRef.current, rows, rowsToTraceTableText(rows), stateRef.current.jsonTraceTableSourceName || sheetName, { jsonTraceTableActiveSheet: sheetName });
    render();
  });

  container.querySelector('[data-field="json-trace-table-text"]')?.addEventListener('change', (event) => {
    stateRef.current = updateTextState(stateRef.current, event.target.value);
    render();
  });

  container.querySelectorAll('[data-json-trace-table-map]').forEach((select) => {
    select.addEventListener('change', () => {
      stateRef.current = updateMapState(stateRef.current, select.dataset.jsonTraceTableMap, select.value);
      render();
    });
  });

  container.querySelector('[data-action="json-trace-table-auto-map"]')?.addEventListener('click', () => {
    const rows = stateRef.current.jsonTraceTableRows?.length ? stateRef.current.jsonTraceTableRows : parseTraceTableText(stateRef.current.jsonTraceTableText || '');
    const traceConfig = normalizeTraceTableConfig(stateRef.current.jsonTraceTableConfig);
    stateRef.current = updateWorkflowState(stateRef.current, {
      jsonTraceTableRows: rows,
      jsonTraceTableConfig: traceConfig,
      jsonTraceTableFieldMap: autoMapTraceTableFields(headersFromTraceRows(rows), rows, traceConfig),
      resolverJsonTraceTableResult:null,jsonTraceTableBenchmark:null,
      jsonTraceTableStatus: `Auto-mapped ${rows.length} table row(s).`,
    });
    render();
  });

  container.querySelector('[data-json-trace-table-profile]')?.addEventListener('change', (event) => {
    stateRef.current = updateTraceProfileState(stateRef.current, event.target.value);
    render();
  });

  container.querySelector('[data-json-trace-table-ambiguity]')?.addEventListener('change', (event) => {
    stateRef.current = updateTraceConfigState(stateRef.current, { ambiguityPolicy: event.target.value });
    render();
  });

  container.querySelector('[data-json-trace-table-tolerance]')?.addEventListener('change', (event) => {
    stateRef.current = updateTraceConfigState(stateRef.current, { coordinateTolerance: Number(event.target.value || 0) });
    render();
  });

  container.querySelectorAll('[data-json-trace-table-rule]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      stateRef.current = updateTraceRuleState(stateRef.current, checkbox.dataset.jsonTraceTableRule, checkbox.checked);
      render();
    });
  });

  container.querySelector('[data-action="build-json-trace-table"]')?.addEventListener('click', async () => {
    stateRef.current = buildTableTraceState(stateRef.current);
    render();
    await compareSidecarState(stateRef,render);
  });

  container.querySelector('[data-action="compare-json-trace-table"]')?.addEventListener('click', async () => {
    if(await compareSidecarState(stateRef,render))return;
    stateRef.current = compareTraceState(stateRef.current);
    render();
  });
}
