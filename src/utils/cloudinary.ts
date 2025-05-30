import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as streamifier from 'streamifier';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_NAME'),
      api_key: this.configService.get('API_KEY'),
      api_secret: this.configService.get('API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'properties',
  ): Promise<UploadApiResponse> {
    const allowedMimeTypes = [
      'image/png',
      'image/jpg',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/avif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only .png, .jpg, .jpeg, .webp, .gif, and .avif formats are allowed',
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'notices',
    options: { resource_type?: string; format?: string } = {
      resource_type: 'pdf',
      format: 'pdf',
    },
  ): Promise<UploadApiResponse> {
    // Ensure filename has a .pdf extension
    const fileWithPdfExtension = filename.endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw', // Use raw for non-image files like PDFs
          public_id: fileWithPdfExtension.replace('.pdf', ''), // Remove '.pdf' from public_id
          format: options.format || 'pdf',
        },
        (error, result) => {
          if (error) return reject(error);

          // Append '.pdf' to secure_url to ensure the extension is there
          if (result?.secure_url && !result.secure_url.endsWith('.pdf')) {
            result.secure_url = `${result.secure_url}.pdf`;
          }

          resolve(result as UploadApiResponse);
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}
