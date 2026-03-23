package com.hackathon.platform.chat;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatService {

    private final List<ChatMessageResponse> messages = new CopyOnWriteArrayList<>();

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:9090}")
    private String baseUrl;

    @PostConstruct
    void initialize() throws IOException {
        Files.createDirectories(Path.of(uploadDir).toAbsolutePath().normalize());
    }

    public List<ChatMessageResponse> listMessages() {
        return messages.stream()
                .sorted(Comparator.comparing(ChatMessageResponse::createdAt))
                .toList();
    }

    public ChatMessageResponse createMessage(ChatMessagePayload payload) {
        ChatMessageResponse message = new ChatMessageResponse(
                UUID.randomUUID().toString(),
                blankToNull(payload.authorUid()),
                StringUtils.hasText(payload.authorName()) ? payload.authorName().trim() : "Team Member",
                blankToNull(payload.authorPhotoURL()),
                StringUtils.hasText(payload.type()) ? payload.type().trim() : "text",
                blankToNull(payload.text()),
                blankToNull(payload.mediaUrl()),
                blankToNull(payload.previewUrl()),
                blankToNull(payload.fileName()),
                blankToNull(payload.mimeType()),
                payload.fileSize(),
                Instant.now()
        );
        messages.add(message);
        return message;
    }

    public FileUploadResponse storeAttachment(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Empty file upload is not allowed.");
        }

        String originalName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "attachment";
        String safeName = UUID.randomUUID() + "-" + originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
        Path target = Path.of(uploadDir).toAbsolutePath().normalize().resolve(safeName);
        Files.createDirectories(target.getParent());

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        }

        String publicUrl = baseUrl + "/uploads/" + safeName;
        return new FileUploadResponse(
                originalName,
                publicUrl,
                file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                file.getSize()
        );
    }

    public List<ChatMessageResponse> seedMessages() {
        if (!messages.isEmpty()) {
            return listMessages();
        }

        List<ChatMessageResponse> seeded = new ArrayList<>();
        seeded.add(new ChatMessageResponse(
                UUID.randomUUID().toString(),
                "system-admin",
                "Workspace Admin",
                null,
                "text",
                "Team chat is now powered by your Spring backend.",
                null,
                null,
                null,
                null,
                null,
                Instant.now().minusSeconds(240)
        ));
        seeded.add(new ChatMessageResponse(
                UUID.randomUUID().toString(),
                "system-bot",
                "Collab Assistant",
                null,
                "text",
                "Uploads and messages sent here stay inside your project backend.",
                null,
                null,
                null,
                null,
                null,
                Instant.now().minusSeconds(180)
        ));
        messages.addAll(seeded);
        return listMessages();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
