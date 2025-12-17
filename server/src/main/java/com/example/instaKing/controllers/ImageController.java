package com.example.instaKing.controllers;

import com.example.instaKing.models.ImageModel;
import com.example.instaKing.payload.response.MessageResponse;
import com.example.instaKing.services.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;

@RestController
@RequestMapping("api/image")
@CrossOrigin
public class ImageController {

    @Autowired
    private ImageService imageService;

    @PostMapping("/upload")
    public ResponseEntity<MessageResponse> uploadImageToUser(@RequestParam("file") MultipartFile file,
                                                             Principal principal) throws IOException {
        imageService.uploadAvatarToUser(file,principal);
        return ResponseEntity.ok(new MessageResponse("Image uploaded successfully"));
    }

    @PostMapping("/{postId}/upload")
    public ResponseEntity<MessageResponse> uploadImageToPost(@PathVariable("postId") String postId,
                                                             @RequestParam("file") MultipartFile file,
                                                             Principal principal) throws IOException {
        imageService.uploadImageToPost(file,principal,Long.parseLong(postId));
        return ResponseEntity.ok(new MessageResponse("Image uploaded successfully"));
    }



    @GetMapping("/{postId}/image")
    public ResponseEntity<Resource> getImageForPost(@PathVariable("postId") Long postId) throws IOException {
        Resource imageResource = imageService.getImageToPost(postId);

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG) // Или другой формат, если требуется
                .body(imageResource);
    }

}
