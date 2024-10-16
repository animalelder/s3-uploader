const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Use express-fileupload middleware to handle file uploads
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

// Set the s3 client options
const clientOptions = {
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true,
};

// Create an S3 client
const s3Client = new S3Client(clientOptions);

// Get the bucket name from the environment variables
const bucketName = process.env.BUCKET_NAME || 'local-bucket-wll';

// Load the html file when the root URL is accessed
// The file loads Tailwind and DaisyUI for styling via CDN
// The file also contains an inline functions to communicate with the endpoints
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// List all images in the bucket
app.get('/images', async (_req, res) => {
  try {
    const listObjectsParams = {
      Bucket: bucketName,
    };
    listObjectsCmd = new ListObjectsV2Command(listObjectsParams);

    const response = await s3Client.send(listObjectsCmd);
    res.send(response.Contents);
  } catch (error) {
    console.error(error);
  }
});

// Get a specific image from the bucket by key
app.get('/images/:key', async (req, res) => {
  try {
    const getObjectParams = {
      Bucket: bucketName,
      Key: req.params.key,
    };

    const getObjectCommand = new GetObjectCommand(getObjectParams);

    const response = await s3Client.send(getObjectCommand);
    if (!response) return res.status(500).send('Error retrieving image');

    res.setHeader('Content-Type', response.ContentType);
    response.Body.pipe(res);
  } catch (error) {
    console.error(error);
  }
});

// Upload an image to the bucket
app.post('/images', async (req, res) => {
  try {
    const file = req.files?.image;
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const putObjectParams = {
      Bucket: bucketName,
      Key: file.name,
      Body: file.data,
    };
    const putObjectCmd = new PutObjectCommand(putObjectParams);

    const response = await s3Client.send(putObjectCmd);
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error uploading image');
  }
});

// Attempt to catch any unhandled errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something is not working!');
});

// Start the server on the specified port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
