const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

const clientOptions = {
  region: 'us-east-1',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true,
};

const s3Client = new S3Client(clientOptions);

const bucketName = 'local-bucket-wll';

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something is not working!');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
