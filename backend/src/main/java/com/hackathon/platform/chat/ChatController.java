package com.hackathon.platform.chat;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/messages")
    public List<ChatMessageResponse> listMessages() {
        return chatService.listMessages();
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse createMessage(@RequestBody ChatMessagePayload payload) {
        return chatService.createMessage(payload);
    }

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public FileUploadResponse uploadAttachment(@RequestParam("file") MultipartFile file) throws IOException {
        return chatService.storeAttachment(file);
    }

    @PostMapping("/seed")
    public List<ChatMessageResponse> seedMessages() {
        return chatService.seedMessages();
    }
}
