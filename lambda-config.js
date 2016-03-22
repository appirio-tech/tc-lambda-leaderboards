module.exports = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
  description: "Function to return leaderboards",
  handler: 'index.handler',
  role: process.env.AWS_LAMBDA_ROLE_ARN,
  region: 'us-east-1',
  handler: 'index.handler',
  functionName: 'tc-leaderboards',
  timeout: 5,
  memorySize: 128
  // eventSource: {}
}
