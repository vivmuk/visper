# Firebase Storage Setup for Whisper

## Storage Bucket

Your Firebase Storage bucket is configured as:
- **Bucket URL**: `gs://wisper-vivek.firebasestorage.app`
- **Bucket Name**: `wisper-vivek.firebasestorage.app`

## Setup Steps

### 1. Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/project/wisper-vivek/storage)
2. Click **"Get started"** if you haven't enabled Storage yet
3. Choose **"Start in test mode"** (for development) or set up security rules
4. Select a location (should match your Firestore location)
5. Click **"Done"**

### 2. Configure Storage Security Rules

Go to **Storage** → **Rules** tab and add these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow users to upload images to their own folder
    match /entries/{userId}/{fileName} {
      allow read: if true; // Public read access for images
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**For Production**, you might want to restrict read access:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /entries/{userId}/{fileName} {
      allow read: if request.auth != null; // Only authenticated users can read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Verify Configuration

The code is configured to use:
- **Bucket**: `wisper-vivek.firebasestorage.app`
- **Storage Path**: `entries/{userId}/{filename}`
- **Public Access**: Images are made publicly accessible after upload

## Testing Image Upload

1. Go to the **Write** tab in your app
2. Click **"Add Image"**
3. Select an image file
4. Add text (optional)
5. Click **"Save Raw"** or **"Save Improved"**
6. Check the **History** tab to see your image

## Storage Structure

Images are stored in the following structure:
```
gs://wisper-vivek.firebasestorage.app/
  └── entries/
      └── {userId}/
          └── {uuid}.{extension}
```

Example:
```
gs://wisper-vivek.firebasestorage.app/entries/temp-user-id/abc123.jpg
```

## Public URLs

After upload, images are accessible at:
```
https://storage.googleapis.com/wisper-vivek.firebasestorage.app/entries/{userId}/{filename}
```

## Troubleshooting

### Error: "Bucket not found"
- Make sure Firebase Storage is enabled in your Firebase Console
- Verify the bucket name matches: `wisper-vivek.firebasestorage.app`

### Error: "Permission denied"
- Check Storage security rules
- Make sure the rules allow write access for authenticated users

### Images not displaying
- Check that `makePublic()` is being called (it is in the code)
- Verify the public URL format is correct
- Check browser console for CORS errors

## Cost Considerations

Firebase Storage pricing:
- **Free tier**: 5 GB storage, 1 GB/day downloads
- **Paid**: $0.026/GB storage, $0.12/GB downloads

For a journal app, the free tier should be sufficient for most users.

