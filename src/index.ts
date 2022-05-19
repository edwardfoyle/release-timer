import { Command } from 'commander';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as aws from 'aws-sdk';
import { CloudWatch } from 'aws-sdk';

const program = new Command();

const timestampLocation = path.join(os.homedir(), '.cli-release', 'timer.txt');

program.name('release-timer').description('Small CLI utility to record start and end release times to CloudWatch').version('1.0.0');

const startHandler = () => {
  if (fs.existsSync(timestampLocation)) {
    console.error('Release timer is already running. Stop the current timer by running `release-timer cancel` or record the current timer by running `release-timer stop`.');
    return;
  }
  if (!fs.pathExistsSync(path.dirname(timestampLocation))) {
    fs.mkdirSync(path.dirname(timestampLocation), {recursive: true});
  }
  fs.writeFileSync(timestampLocation, Date.now().toString());
  console.log('Release timer started. Good luck!')
}

program.command('start')
  .description('Start a release timer')
  .action(startHandler)


const cancelHandler = () => {
  if (!fs.existsSync(timestampLocation)) {
    console.error('No release timer is running. Start one using `release-timer start`');
    return;
  }
  fs.unlinkSync(timestampLocation);
  console.log('Cancelled release timer');
}
program.command('cancel')
  .description('Cancel a release timer')
  .action(cancelHandler);

const stopHandler = async (args: {profile?: string}) => {
  if (!fs.existsSync(timestampLocation)) {
    console.error('No release timer is running. Start one using `release-timer start`');
    return;
  }
  const intiialTimeStr = fs.readFileSync(timestampLocation, 'utf-8');
  const initialTime = new Date(Number(intiialTimeStr));
  const releaseDurationSeconds = Math.round((Date.now() - initialTime.getTime()) / 1000);
  if (args.profile) {
    aws.config.credentials = new aws.SharedIniFileCredentials({profile: args.profile});
    console.log(`Using ${args.profile} to record to CloudWatch`);
  } else {
    aws.config.credentials = new aws.EnvironmentCredentials('AWS');
    console.log('Using environment varialbe credentials');
  }
  
  const region = 'us-west-2';
  const cloudWatchClient = new aws.CloudWatch({region});
  const params: CloudWatch.Types.PutMetricDataInput = {
    Namespace: 'release-metrics',
    MetricData: [
      {
        MetricName: 'total-duration',
        Unit: 'Seconds',
        Value: releaseDurationSeconds,
      }
    ]
  }
  try {
    await cloudWatchClient.putMetricData(params).promise();
  } catch (err) {
    console.error('putMetricData failed. Make sure you specified the profile that has test account credentials or that you have credentials available as environment variables.');
    throw err
  }
  fs.unlinkSync(timestampLocation);
  console.log(`Successfully recorded release duration of ${releaseDurationSeconds} seconds`);
}

program.command('stop')
  .description('Stop a release time and record the value to CloudWatch')
  .option('-p, --profile <string>', 'The AWS profile to use for authenticating with CloudWatch. If not specified, will try to use environment variables.')
  .action(stopHandler);

program.parseAsync().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
