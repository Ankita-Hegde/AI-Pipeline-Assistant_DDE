import { Pipeline } from './types';

export interface ValidationResult {
  isValid: boolean;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

/**
 * Validate a pipeline based on its generated configuration
 * Note: This is called from client-side, so it validates the Pipeline object in memory
 * For YAML config checking, use validatePipelineWithConfig
 */
export function validatePipeline(pipeline: Pipeline, yamlConfig?: any): ValidationResult {
  const checks: ValidationCheck[] = [];

  // 1. Check if pipeline has a name
  checks.push({
    name: 'Pipeline Name',
    status: pipeline.name && pipeline.name.trim() ? 'pass' : 'fail',
    message: pipeline.name ? `✓ Pipeline named: "${pipeline.name}"` : '✗ Pipeline must have a name',
  });

  // 2. Check if pipeline has a description
  checks.push({
    name: 'Pipeline Description',
    status: pipeline.description ? 'pass' : 'warn',
    message: pipeline.description ? `✓ Description provided` : '⚠ Consider adding a description',
    details: pipeline.description,
  });

  // 3. Check trigger configuration
  checks.push({
    name: 'Trigger Type',
    status: pipeline.trigger ? 'pass' : 'fail',
    message: pipeline.trigger ? `✓ Trigger configured: ${pipeline.trigger}` : '✗ Trigger type must be specified',
  });

  // 4. Check schedule if trigger is scheduled
  if (pipeline.trigger === 'scheduled') {
    checks.push({
      name: 'Schedule',
      status: pipeline.schedule ? 'pass' : 'warn',
      message: pipeline.schedule ? `✓ Schedule: ${pipeline.schedule}` : '⚠ Scheduled trigger requires a cron schedule',
    });
  }

  // 5. Check for data source (check both steps array and optional YAML config)
  const hasSource = pipeline.steps.some(s => s.type === 'source') || (yamlConfig?.hasSource);
  checks.push({
    name: 'Data Source',
    status: hasSource ? 'pass' : 'fail',
    message: hasSource 
      ? `✓ Source configured: ${pipeline.steps.find(s => s.type === 'source')?.name || 'Google Sheets'}`
      : '✗ Pipeline must have at least one source step',
  });

  // 6. Check for data destination (check both steps array and optional YAML config)
  const hasDestination = pipeline.steps.some(s => s.type === 'destination') || (yamlConfig?.hasDestination);
  checks.push({
    name: 'Data Destination',
    status: hasDestination ? 'pass' : 'fail',
    message: hasDestination
      ? `✓ Destination configured: ${pipeline.steps.find(s => s.type === 'destination')?.name || 'Google Sheets'}`
      : '✗ Pipeline must have at least one destination step',
  });

  // 7. Check for transformations (check both steps array and optional YAML config)
  const hasTransforms = pipeline.steps.some(s => s.type === 'transform') || (yamlConfig?.hasTransformations);
  checks.push({
    name: 'Data Transformations',
    status: hasTransforms ? 'pass' : 'warn',
    message: hasTransforms 
      ? `✓ ${pipeline.steps.filter(s => s.type === 'transform').length || 'Multiple'} transformation(s) configured`
      : '⚠ Consider adding transformation steps for data processing',
  });

  // 8. Check step configuration completeness
  const stepsWithoutConfig = pipeline.steps.filter(s => !s.config || Object.keys(s.config).length === 0);
  checks.push({
    name: 'Step Configuration',
    status: stepsWithoutConfig.length === 0 ? 'pass' : 'warn',
    message: stepsWithoutConfig.length === 0
      ? `✓ All ${pipeline.steps.length} steps are configured`
      : `⚠ ${stepsWithoutConfig.length} step(s) missing configuration`,
  });

  // 9. Check owner email
  checks.push({
    name: 'Owner',
    status: pipeline.ownerEmail ? 'pass' : 'warn',
    message: pipeline.ownerEmail ? `✓ Owner: ${pipeline.ownerEmail}` : '⚠ Consider setting an owner email',
  });

  // 10. Check pipeline status
  checks.push({
    name: 'Pipeline Status',
    status: pipeline.status === 'draft' ? 'warn' : 'pass',
    message: pipeline.status === 'draft' 
      ? `⚠ Pipeline is in draft status`
      : `✓ Pipeline status: ${pipeline.status}`,
  });

  // Calculate overall validity
  const hasFails = checks.some(c => c.status === 'fail');
  const isValid = !hasFails;

  return {
    isValid,
    checks,
  };
}

/**
 * Get validation summary text
 */
export function getValidationSummary(result: ValidationResult): string {
  const passes = result.checks.filter(c => c.status === 'pass').length;
  const warns = result.checks.filter(c => c.status === 'warn').length;
  const fails = result.checks.filter(c => c.status === 'fail').length;
  
  if (fails > 0) {
    return `❌ Pipeline has issues: ${fails} error(s), ${warns} warning(s)`;
  }
  if (warns > 0) {
    return `⚠️  Pipeline ready with recommendations: ${passes} check(s) passed, ${warns} warning(s)`;
  }
  return `✅ Pipeline is valid: All ${passes} checks passed`;
}
