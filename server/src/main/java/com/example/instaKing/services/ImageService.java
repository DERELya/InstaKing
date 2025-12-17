package com.example.instaKing.services;

import com.example.instaKing.exceptions.ImageNotFoundException;
import com.example.instaKing.models.ImageModel;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.ImageRepository;
import com.example.instaKing.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.Principal;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional // Гарантирует целостность операций БД
public class ImageService {

    private final ImageRepository imageRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.path}")
    private String uploadPath;

    @Autowired
    public ImageService(ImageRepository imageRepository, UserRepository userRepository) {
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
    }

    private String saveFileToDisk(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("Failed to store empty file.");
        }

        // Простая валидация на тип изображения (можно расширить)
        if (!Objects.requireNonNull(file.getContentType()).startsWith("image")) {
            throw new IOException("Invalid file type. Only images are allowed.");
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String fileName = UUID.randomUUID() + "_" + originalFilename;

        Path rootLocation = Paths.get(uploadPath);
        if (!Files.exists(rootLocation)) {
            Files.createDirectories(rootLocation);
        }

        Path destinationFile = rootLocation.resolve(fileName).normalize().toAbsolutePath();

        if (!destinationFile.getParent().equals(rootLocation.toAbsolutePath())) {
            throw new IOException("Cannot store file outside current directory.");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
        }

        return fileName;
    }

    public void uploadAvatarToUser(MultipartFile file, Principal principal) throws IOException {
        User user = getUserByPrincipal(principal);

        if (user.getAvatarUrl() != null) {
            deleteFileFromDisk(user.getAvatarUrl());
        }

        String fileName = saveFileToDisk(file);
        user.setAvatarUrl(fileName);
        userRepository.save(user);
    }

    public ImageModel uploadImageToPost(MultipartFile file, Principal principal, Long postId) throws IOException {
        User user = getUserByPrincipal(principal);
        Post post = user.getPosts().stream()
                .filter(p -> p.getId().equals(postId))
                .findFirst()
                .orElseThrow(() -> new ImageNotFoundException("Post not found in user's posts"));

        String fileName = saveFileToDisk(file);

        ImageModel imageModel = new ImageModel();
        imageModel.setPostId(post.getId());
        imageModel.setImagePath(fileName);
        imageModel.setName(file.getOriginalFilename());
        return imageRepository.save(imageModel);
    }

    public void deleteImageByPostId(Long postId) throws IOException {
        ImageModel imageModel = imageRepository.findByPostId(postId).orElse(null);
        if (imageModel != null) {
            deleteFileFromDisk(imageModel.getImagePath());
            imageRepository.delete(imageModel);
        }
    }


    public Resource getImageToPost(Long postId) throws IOException {
        ImageModel imageModel = imageRepository.findByPostId(postId)
                .orElseThrow(() -> new ImageNotFoundException("Image for post not found"));

        return loadFileAsResource(imageModel.getImagePath());
    }


    private Resource loadFileAsResource(String filename) throws FileNotFoundException, MalformedURLException {
        Path filePath = Paths.get(uploadPath).resolve(filename).normalize();
        Resource resource = new UrlResource(filePath.toUri());

        if (resource.exists() && resource.isReadable()) {
            return resource;
        } else {
            throw new FileNotFoundException("File not found or not readable: " + filename);
        }
    }

    private void deleteFileFromDisk(String filename) {
        try {
            Path filePath = Paths.get(uploadPath).resolve(filename);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Could not delete file: " + filename + ". Error: " + e.getMessage());
        }
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Username not found with username " + username));
    }
}