import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { AppError, ErrorCode } from './errors';
import { logger } from './logger';

export interface MediaValidationRules {
  allowedMimeTypes: string[];
  maxSizeBytes: number;
}

const DEFAULT_RULES: MediaValidationRules = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
};

export class MediaService {
  private storage: Storage;
  private bucketName: string;

  constructor(projectId?: string, bucketName?: string, keyFilename?: string) {
    this.storage = new Storage({
      projectId,
      keyFilename, // Used for local dev if provided
    });
    this.bucketName = bucketName || '';
  }

  /**
   * Validates file type and size
   */
  validateFile(mimetype: string, sizeBytes: number, rules: MediaValidationRules = DEFAULT_RULES): void {
    if (!rules.allowedMimeTypes.includes(mimetype)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid file type. Allowed: ${rules.allowedMimeTypes.join(', ')}`
      );
    }

    if (sizeBytes > rules.maxSizeBytes) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `File too large. Maximum size: ${rules.maxSizeBytes / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Converts a buffer to WebP format
   */
  async convertToWebP(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to convert image to WebP', error);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Image processing failed');
    }
  }

  /**
   * Uploads a file to GCS and returns the public URL
   */
  async uploadFile(buffer: Buffer, destination: string, mimetype: string): Promise<string> {
    if (!this.bucketName) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'GCS bucket name not configured');
    }

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(destination);

    try {
      await file.save(buffer, {
        metadata: { contentType: mimetype },
        resumable: false,
      });

      return `https://storage.googleapis.com/${this.bucketName}/${destination}`;
    } catch (error) {
      logger.error('GCS Upload failed', error);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to upload file to storage');
    }
  }

  /**
   * Deletes a file from GCS
   */
  async deleteFile(filename: string): Promise<void> {
    if (!this.bucketName) return;

    try {
      await this.storage.bucket(this.bucketName).file(filename).delete();
    } catch (error) {
      logger.error('GCS Delete failed', error);
      // We don't necessarily want to throw if delete fails (e.g. file already gone)
    }
  }

  /**
   * Generates a signed URL for temporary access
   */
  async getSignedUrl(filename: string, expiresMinutes: number = 15): Promise<string> {
    if (!this.bucketName) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'GCS bucket name not configured');
    }

    try {
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(filename)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + expiresMinutes * 60 * 1000,
        });
      return url;
    } catch (error) {
      logger.error('GCS Signed URL generation failed', error);
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to generate signed URL');
    }
  }
}
