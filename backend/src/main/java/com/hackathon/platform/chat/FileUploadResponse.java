package com.hackathon.platform.chat;

public record FileUploadResponse(
        String fileName,
        String url,
        String mimeType,
        long fileSize
) {
}
