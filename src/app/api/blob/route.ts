/**
 * Blob Storage API Route
 *
 * Server-side API endpoint for managing files in Vercel Blob Storage.
 * This keeps the blob token secure on the server side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * PUT /api/blob
 *
 * Uploads a file to Vercel Blob Storage
 *
 * Request: multipart/form-data with:
 * - file: File to upload
 * - folder: Folder path (optional, defaults to "uploads")
 */
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get the blob token from environment
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Upload to Vercel Blob Storage
    const blob = await put(`${folder}/${file.name}`, file, {
      access: 'public',
      token,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blob
 *
 * Deletes a file from Vercel Blob Storage
 *
 * Request body:
 * {
 *   url: string;  // URL of the file to delete
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    // Get the blob token from environment
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    // Delete from Vercel Blob Storage
    await del(url, {
      token,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      },
      { status: 500 }
    );
  }
}
