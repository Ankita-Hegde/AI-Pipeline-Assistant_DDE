import { NextRequest, NextResponse } from 'next/server';
import { getPipeline, saveExecution, savePipeline } from '@/lib/db';
import { PipelineExecution, PipelineStatus } from '@/lib/types';
import { randomUUID } from 'crypto';
import { fetchSheetData, writeSheetData } from '@/lib/googleSheets';
import { pipelineArtifactsExist, getPipelinePythonPath, getPipelineLogsPath } from '@/lib/artifacts';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface ParamsPromise {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: ParamsPromise) {
  const { id } = await params;
  const pipeline = getPipeline(id);
  if (!pipeline) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const start = new Date().toISOString();
  const logs: string[] = [];
  let executionStatus: 'succeeded' | 'failed' = 'succeeded';
  let pipelineData: any = null;
  const metrics = {
    rowsProcessed: 0,
    transformationsApplied: 0,
    dataWritten: 0,
    executionTime: 0,
  };

  try {
    // Update pipeline status to running
    savePipeline({ ...pipeline, status: 'running' });
    
    logs.push(`🚀 Starting pipeline execution: "${pipeline.name}"`);
    logs.push(`📊 Total steps: ${pipeline.steps.length}`);
    logs.push(`⏰ Started at: ${new Date(start).toLocaleString()}`);

    // Check if pipeline should be simulated
    // Simulate if source or destination is MySQL, PostgreSQL, or any non-Google Sheets connector
    const sourceStep = pipeline.steps.find(s => s.type === 'source');
    const destinationStep = pipeline.steps.find(s => s.type === 'destination');
    
    const isMySQLSource = sourceStep && (sourceStep.name.includes('MySQL') || (sourceStep.config as any)?.type === 'mysql');
    const isMySQLDestination = destinationStep && (destinationStep.name.includes('MySQL') || (destinationStep.config as any)?.type === 'mysql');
    const isPostgresSource = sourceStep && (sourceStep.name.includes('PostgreSQL') || (sourceStep.config as any)?.type === 'postgresql');
    const isPostgresDestination = destinationStep && (destinationStep.name.includes('PostgreSQL') || (destinationStep.config as any)?.type === 'postgresql');
    
    const shouldSimulate = isMySQLSource || isMySQLDestination || isPostgresSource || isPostgresDestination;
    const isGoogleSheetsOnly = 
      sourceStep && (sourceStep.name.includes('Google Sheets') || (sourceStep.config as any)?.type === 'google_sheets') &&
      destinationStep && (destinationStep.name.includes('Google Sheets') || (destinationStep.config as any)?.type === 'google_sheets') &&
      !shouldSimulate;

    // Check if this pipeline has AI-generated artifacts
    const hasArtifacts = await pipelineArtifactsExist(id);

    if (hasArtifacts && !shouldSimulate) {
      // Execute the AI-generated Python code only if not simulating
      logs.push(`\n🤖 Detected AI-generated pipeline - executing custom Python code...`);
      const pythonPath = getPipelinePythonPath(id);
      const logsPath = getPipelineLogsPath(id);
      const logFile = path.join(logsPath, `execution_${Date.now()}.log`);
      const artifactsDir = path.dirname(pythonPath);

      try {
        // Copy credentials.json from project root to artifacts directory if it exists
        const projectRootCredentials = path.join(process.cwd(), 'credentials.json');
        const artifactCredentials = path.join(artifactsDir, 'credentials.json');
        
        try {
          await fs.copyFile(projectRootCredentials, artifactCredentials);
          logs.push(`📋 Credentials copied to pipeline directory`);
        } catch (credError: any) {
          // Credentials file may not exist or may already be there
          if (!credError.code?.includes('ENOENT')) {
            logs.push(`⚠️  Warning: Could not copy credentials - ${credError.message}`);
          }
        }

        logs.push(`📝 Python script: ${pythonPath}`);
        logs.push(`📁 Log output: ${logFile}`);
        logs.push(`\n━━━ Python Execution Output ━━━`);

        // Determine the correct Python executable (use virtual environment if available)
        const pythonExecutable = process.env.PYTHON_EXECUTABLE || '/Users/ankitahegde/Desktop/DDE/dde project/.venv/bin/python' || 'python3';

        // Execute Python script with artifacts directory as working directory
        const { stdout, stderr } = await execAsync(`"${pythonExecutable}" "${pythonPath}" 2>&1`, {
          cwd: artifactsDir,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });

        // Save logs to file
        await fs.writeFile(logFile, `${stdout}\n${stderr}`, 'utf-8');

        // Add output to logs
        if (stdout) {
          logs.push(stdout);
        }
        if (stderr) {
          logs.push(`\n⚠️  Stderr:\n${stderr}`);
        }

        logs.push(`\n━━━ Python Execution Complete ━━━`);
        logs.push(`✅ Generated code executed successfully`);
        
        executionStatus = 'succeeded';

      } catch (error: any) {
        logs.push(`\n❌ Python execution failed:`);
        logs.push(error.message);
        if (error.stdout) logs.push(`\nStdout:\n${error.stdout}`);
        if (error.stderr) logs.push(`\nStderr:\n${error.stderr}`);
        executionStatus = 'failed';
      }
    } else if (hasArtifacts && shouldSimulate) {
      // Simulate AI-generated pipeline (has MySQL/PostgreSQL)
      logs.push(`\n🤖 AI-generated pipeline detected with external database connector`);
      logs.push(`\n📋 SIMULATED EXECUTION (MySQL/PostgreSQL not available)`);
      logs.push(`⚠️  This pipeline uses MySQL/PostgreSQL - showing simulated results`);
      logs.push(`\n━━━ Simulated Execution ━━━`);
      
      for (const step of pipeline.steps) {
        logs.push(`\n✓ Step ${pipeline.steps.indexOf(step) + 1}: ${step.name} (${step.type})`);
        logs.push(`  └─ Simulated (not executed)`);
      }
      
      logs.push(`\n✅ Simulated pipeline execution completed successfully!`);
      logs.push(`⏱️  Finished at: ${new Date().toLocaleString()}`);
      logs.push(`\n💡 Note: This is a simulated result. Actual execution requires MySQL/PostgreSQL connectivity.`);
      executionStatus = 'succeeded';
    } else {
      // Original hardcoded transformation engine
      
      // Check if pipeline should be simulated (only run actual execution for Google Sheets)
      if (shouldSimulate) {
        logs.push(`\n📋 Using built-in transformation engine (Simulated)...`);
        logs.push(`⚠️  Pipeline uses MySQL/PostgreSQL or other non-Google Sheets connectors - simulating execution`);
        
        // Simulate each step
        for (const step of pipeline.steps) {
          logs.push(`\n━━━ Step ${pipeline.steps.indexOf(step) + 1}: ${step.name} (${step.type}) ━━━`);
          logs.push(`✓  Step simulated (not executed)`);
        }
        
        logs.push(`\n✅ Simulated pipeline execution completed successfully!`);
        logs.push(`⏱️  Finished at: ${new Date().toLocaleString()}`);
        executionStatus = 'succeeded';
      } else {
        // Only execute actual pipeline for Google Sheets
        logs.push(`\n📋 Using built-in transformation engine...`);
      
        // Execute each step
        for (const step of pipeline.steps) {
          logs.push(`\n━━━ Step ${pipeline.steps.indexOf(step) + 1}: ${step.name} (${step.type}) ━━━`);
          
          // SOURCE STEP
          if (step.type === 'source') {
            const config = step.config as any;
            
            if (step.name.includes('Google Sheets') || config?.type === 'google_sheets') {
              try {
                logs.push(`📥 Fetching data from Google Sheets...`);
                logs.push(`   Spreadsheet ID: ${config.spreadsheetId}`);
                logs.push(`   Range: ${config.range}`);
                
                const result = await fetchSheetData({
                  spreadsheetId: config.spreadsheetId,
                  range: config.range,
                  credentialsPath: config.credentialsPath,
                });
                
                pipelineData = result.data;
                metrics.rowsProcessed = result.rowCount || 0;
                logs.push(`✅ Successfully fetched ${result.rowCount} rows`);
                logs.push(`   Columns: ${result.headers?.join(', ')}`);
              } catch (error: any) {
                logs.push(`❌ Error fetching Google Sheets data: ${error.message}`);
                executionStatus = 'failed';
                break;
              }
            } else if (step.name.includes('MySQL') || config?.type === 'mysql') {
              logs.push(`⚠️  MySQL source not yet implemented`);
              logs.push(`✓  Step completed (simulated)`);
            } else {
              logs.push(`✓  Step completed (simulated)`);
            }
          }
          // TRANSFORM STEP
          else if (step.type === 'transform') {
            logs.push(`🔄 Transforming data...`);
            if (pipelineData && Array.isArray(pipelineData) && pipelineData.length > 0) {
              logs.push(`   Processing ${pipelineData.length} records`);
              metrics.transformationsApplied++;
              const config = step.config as any;
              try {
                // Apply transformations based on config
                let transformedData = [...pipelineData];
                
                // 1. Column Mapping/Renaming
                if (config.columnMapping && typeof config.columnMapping === 'object') {
                  logs.push(`   Applying column mapping...`);
                  transformedData = transformedData.map(row => {
                    const newRow: any = {};
                    for (const [oldName, newName] of Object.entries(config.columnMapping)) {
                      if (row.hasOwnProperty(oldName)) {
                        newRow[newName as string] = row[oldName];
                      }
                    }
                    // Keep columns not in mapping
                    for (const [key, value] of Object.entries(row)) {
                      if (!config.columnMapping.hasOwnProperty(key)) {
                        newRow[key] = value;
                      }
                    }
                    return newRow;
                  });
                  logs.push(`   ✓ Columns renamed`);
                }
                
                // 2. Filter Rows
                if (config.filter && typeof config.filter === 'object') {
                  logs.push(`   Applying filters...`);
                  const beforeCount = transformedData.length;
                  transformedData = transformedData.filter(row => {
                    for (const [column, condition] of Object.entries(config.filter)) {
                      const value = row[column];
                      const cond = condition as any;
                      
                      // Handle different filter types
                      if (cond.equals !== undefined && value != cond.equals) return false;
                      if (cond.notEquals !== undefined && value == cond.notEquals) return false;
                      if (cond.greaterThan !== undefined && !(parseFloat(value) > cond.greaterThan)) return false;
                      if (cond.lessThan !== undefined && !(parseFloat(value) < cond.lessThan)) return false;
                      if (cond.contains !== undefined && !String(value).includes(cond.contains)) return false;
                      if (cond.notNull !== undefined && cond.notNull && (value === null || value === undefined || value === '')) return false;
                    }
                    return true;
                  });
                  logs.push(`   ✓ Filtered ${beforeCount} → ${transformedData.length} rows`);
                }
                
                // 3. Add Calculated Columns
                if (config.addColumns && Array.isArray(config.addColumns)) {
                  logs.push(`   Adding calculated columns...`);
                  for (const colDef of config.addColumns) {
                    const { name, expression, type } = colDef;
                    transformedData = transformedData.map(row => {
                      try {
                        // Simple expression evaluation (supports basic operations)
                        let value = expression;
                        // Replace column references like {columnName} with actual values
                        value = value.replace(/\{(\w+)\}/g, (match: string, colName: string) => {
                          return row[colName] !== undefined ? row[colName] : '';
                        });
                        
                        // Evaluate simple math expressions
                        if (type === 'number' && /^[\d\s+\-*/(). ]+$/.test(value)) {
                          value = eval(value);
                        }
                        
                        row[name] = value;
                      } catch (e) {
                        row[name] = null;
                      }
                      return row;
                    });
                  }
                  logs.push(`   ✓ Added ${config.addColumns.length} columns`);
                }
                
                // 4. Select Specific Columns
                if (config.selectColumns && Array.isArray(config.selectColumns)) {
                  logs.push(`   Selecting specific columns...`);
                  transformedData = transformedData.map(row => {
                    const newRow: any = {};
                    for (const col of config.selectColumns) {
                      if (row.hasOwnProperty(col)) {
                        newRow[col] = row[col];
                      }
                    }
                    return newRow;
                  });
                  logs.push(`   ✓ Selected ${config.selectColumns.length} columns`);
                }
                
                // 5. Data Type Conversions
                if (config.convertTypes && typeof config.convertTypes === 'object') {
                  logs.push(`   Converting data types...`);
                  transformedData = transformedData.map(row => {
                    for (const [column, targetType] of Object.entries(config.convertTypes)) {
                      if (row.hasOwnProperty(column)) {
                        const value = row[column];
                        switch (targetType) {
                          case 'number':
                            row[column] = parseFloat(value) || 0;
                            break;
                          case 'string':
                            row[column] = String(value);
                            break;
                          case 'boolean':
                            row[column] = Boolean(value);
                            break;
                          case 'uppercase':
                            row[column] = String(value).toUpperCase();
                            break;
                          case 'lowercase':
                            row[column] = String(value).toLowerCase();
                            break;
                        }
                      }
                    }
                    return row;
                  });
                  logs.push(`   ✓ Types converted`);
                }
                
                // 6. Aggregation (group by)
                if (config.groupBy && config.aggregations) {
                  logs.push(`   Applying aggregations...`);
                  const grouped = new Map();
                  
                  for (const row of transformedData) {
                    const key = Array.isArray(config.groupBy) 
                      ? config.groupBy.map((col: string) => row[col]).join('|')
                      : row[config.groupBy];
                    
                    if (!grouped.has(key)) {
                      grouped.set(key, []);
                    }
                    grouped.get(key).push(row);
                  }
                  
                  transformedData = Array.from(grouped.entries()).map(([key, rows]) => {
                    const result: any = {};
                    
                    // Add group by columns
                    const groupCols = Array.isArray(config.groupBy) ? config.groupBy : [config.groupBy];
                    groupCols.forEach((col: string, i: number) => {
                      result[col] = key.split('|')[i];
                    });
                    
                    // Apply aggregations
                    for (const agg of config.aggregations) {
                      const { column, operation, alias } = agg;
                      const values = rows.map((r: any) => parseFloat(r[column]) || 0);
                      
                      switch (operation) {
                        case 'sum':
                          result[alias || `${column}_sum`] = values.reduce((a: number, b: number) => a + b, 0);
                          break;
                        case 'avg':
                          result[alias || `${column}_avg`] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                          break;
                        case 'count':
                          result[alias || `${column}_count`] = values.length;
                          break;
                        case 'min':
                          result[alias || `${column}_min`] = Math.min(...values);
                          break;
                        case 'max':
                          result[alias || `${column}_max`] = Math.max(...values);
                          break;
                      }
                    }
                    
                    return result;
                  });
                  logs.push(`   ✓ Grouped into ${transformedData.length} records`);
                }
                
                // Update pipeline data with transformed data
                pipelineData = transformedData;
                logs.push(`✅ Transformation completed: ${pipelineData.length} records`);
              } catch (error: any) {
                logs.push(`❌ Transformation error: ${error.message}`);
                executionStatus = 'failed';
                break;
              }
            } else {
              logs.push(`✓  Step completed (no data to transform)`);
            }
          }
          // DESTINATION STEP
          else if (step.type === 'destination') {
            const config = step.config as any;
            
            if (step.name.includes('Google Sheets') || config?.type === 'google_sheets') {
              try {
                logs.push(`📤 Writing data to Google Sheets...`);
                logs.push(`   Spreadsheet ID: ${config.spreadsheetId}`);
                if (config.range) {
                  logs.push(`   Range: ${config.range}`);
                } else {
                  logs.push(`   Creating new sheet for output...`);
                }
                
                if (!pipelineData) {
                  logs.push(`⚠️  No data to write (no source data available)`);
                  logs.push(`✓  Step completed (no action taken)`);
                } else {
                  // Convert data back to 2D array format for Google Sheets
                  const headers = Object.keys(pipelineData[0] || {});
                  const rows = pipelineData.map((row: any) => 
                    headers.map(h => row[h] ?? '')
                  );
                  const dataToWrite = [headers, ...rows];
                  
                  const result = await writeSheetData({
                    spreadsheetId: config.spreadsheetId,
                    range: config.range,
                    credentialsPath: config.credentialsPath,
                    data: dataToWrite,
                    sheetName: config.sheetName || `Pipeline_${pipeline.name}_Output`,
                  });
                  
                  logs.push(`✅ Successfully wrote ${result.updatedRows} rows to Google Sheets`);
                  logs.push(`   Sheet: ${result.sheetName}`);
                  logs.push(`   Range: ${result.range}`);
                  logs.push(`   Updated ${result.updatedCells} cells`);
                  metrics.dataWritten = result.updatedRows || 0;
                }
              } catch (error: any) {
                logs.push(`❌ Error writing to Google Sheets: ${error.message}`);
                executionStatus = 'failed';
                break;
              }
            } else if (step.name.includes('MySQL') || config?.type === 'mysql') {
              logs.push(`⚠️  MySQL destination not yet implemented`);
              logs.push(`✓  Step completed (simulated)`);
            } else {
              logs.push(`✓  Step completed (simulated)`);
            }
          }
        }
      }
    }
  } catch (error: any) {
    logs.push(`\n💥 Pipeline execution error: ${error.message}`);
    executionStatus = 'failed';
  }

  // Update pipeline status based on execution result
  const pipelineStatus: PipelineStatus = executionStatus === 'succeeded' ? 'succeeded' : 'failed';
  metrics.executionTime = new Date().getTime() - new Date(start).getTime();
  
  const updatedPipeline = savePipeline({ 
    ...pipeline, 
    status: pipelineStatus,
    updatedAt: new Date().toISOString()
  });

  const execution: PipelineExecution = {
    id: randomUUID(),
    pipelineId: pipeline.id,
    startedAt: start,
    finishedAt: new Date().toISOString(),
    status: executionStatus,
    logs,
    metrics,
  };

  saveExecution(execution);
  return NextResponse.json(execution, { status: 201 });
}
