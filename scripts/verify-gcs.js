const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

async function verifyGCS() {
  console.log('--- GCS Connection Verification ---');
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const bucketName = process.env.GCS_MEDIA_BUCKET;
  const keyFilename = process.env.GCS_CREDENTIALS;

  console.log(`Target Project: ${projectId}`);
  console.log(`Target Bucket: ${bucketName}`);
  
  const storage = new Storage({
    projectId,
    keyFilename: keyFilename && require('fs').existsSync(keyFilename) ? keyFilename : undefined
  });

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file('connection-test.txt');
    const content = `GCS Connection Test at ${new Date().toISOString()}`;
    
    console.log('Attempting to upload a test file...');
    await file.save(content, {
      resumable: false,
      contentType: 'text/plain'
    });

    console.log('✅ GCS Connection Successful! (Object Upload Verified)');
    
    console.log('Attempting to delete the test file...');
    await file.delete();
    console.log('✅ GCS Cleanup Successful!');
  } catch (error) {
    console.error('❌ GCS Connection Failed');
    console.error(`Error Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    
    if (error.code === 401 || error.code === 403) {
      console.log('\n--- Troubleshooting Tip ---');
      console.log('It looks like a Permission or Authentication issue.');
      console.log('1. Ensure you have run: gcloud auth application-default login');
      console.log('2. OR place your service-account.json in the root folder.');
    }
  }
}

verifyGCS();
