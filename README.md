# release-timer
Small CLI utility to record release duration to CloudWatch

# Installation
`git clone https://github.com/edwardfoyle/release-timer.git && cd release-timer && npm run setup`

# Usage
Run `release-timer start` when starting the release process. This starts a local timer.

Run `release-timer stop` to stop the timer and record the elapsed time to CloudWatch
> This command needs AWS credentials to the test account. Specify credentials either using the `--profile` option or setting environment variables

I recommend creating an alias for `release-timer stop --profile <test-account-profile-name>` and then use that so you don't forget to add the profile arg in the future

Run `release-timer cancel` to stop the timer but NOT record to CloudWatch
