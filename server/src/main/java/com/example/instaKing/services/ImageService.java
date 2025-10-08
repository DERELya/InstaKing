package com.example.instaKing.services;

import com.example.instaKing.exceptions.ImageNotFoundException;
import com.example.instaKing.models.ImageModel;
import com.example.instaKing.models.Post;
import com.example.instaKing.models.User;
import com.example.instaKing.repositories.ImageRepository;
import com.example.instaKing.repositories.PostRepository;
import com.example.instaKing.repositories.UserRepository;
import com.example.instaKing.security.SecurityConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.UUID;
import java.util.stream.Collector;
import java.util.stream.Collectors;

import static com.example.instaKing.security.SecurityConstants.UPLOAD_DIR;

@Service
public class ImageService {

    private ImageRepository imageRepository;
    private UserRepository userRepository;
    private PostRepository postRepository;


    @Autowired
    public ImageService(ImageRepository imageRepository, UserRepository userRepository, PostRepository postRepository) {
        this.imageRepository = imageRepository;
        this.userRepository = userRepository;
        this.postRepository = postRepository;
    }

    public String saveImage(MultipartFile file) throws IOException {
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename(); // Уникальное имя
        Path filePath = Paths.get(SecurityConstants.UPLOAD_DIR + fileName);

        Files.createDirectories(filePath.getParent()); // Создаём папку, если её нет
        Files.write(filePath, file.getBytes()); // Записываем файл

        return fileName; // Сохраняем имя в базе данных
    }

    public ImageModel uploadImageToUser(MultipartFile file, Principal principal) throws IOException {
        User user = getUserByPrincipal(principal);

        // Удаление старого изображения пользователя, если оно есть
        ImageModel userProfileImage = imageRepository.findByUserId(user.getId()).orElse(null);
        if (!ObjectUtils.isEmpty(userProfileImage)) {
            Files.deleteIfExists(Paths.get(UPLOAD_DIR + userProfileImage.getImagePath())); // Удаляем файл
            imageRepository.delete(userProfileImage);
        }
        // Создание нового файла
        String fileName = saveImage(file);// Записываем файл
        // Сохранение пути в БД
        ImageModel imageModel = new ImageModel();
        imageModel.setUserId(user.getId());
        imageModel.setImagePath(fileName);
        imageModel.setName(file.getOriginalFilename());

        return imageRepository.save(imageModel);
    }
    public  void deleteImageByPostId(Long postId) throws IOException {
        ImageModel imageModel = imageRepository.findByPostId(postId).orElse(null);
        if (imageModel != null) {
            System.out.println("gg"+postId);
            Files.deleteIfExists(Paths.get(UPLOAD_DIR + imageModel.getImagePath()));
            imageRepository.delete(imageModel);
        }
    }

    public ImageModel uploadImageToPost(MultipartFile file, Principal principal, Long postId) throws IOException {
        User user = getUserByPrincipal(principal);
        Post post = user.getPosts()
                .stream()
                .filter(p -> p.getId().equals(postId))
                .collect(toSinglePostCollector());

        String fileName = saveImage(file);

        ImageModel imageModel = new ImageModel();
        imageModel.setPostId(post.getId());
        imageModel.setImagePath(fileName);
        imageModel.setName(file.getOriginalFilename());

        return imageRepository.save(imageModel);
    }

    public Resource getImageToCurrentUser(Principal principal) throws IOException {
        User user = getUserByPrincipal(principal);
        ImageModel imageModel = imageRepository.findByUserId(user.getId()).orElseThrow(() -> new ImageNotFoundException("Image not found"));

        Path filePath = Paths.get(UPLOAD_DIR + imageModel.getImagePath());
        Resource resource = new UrlResource(filePath.toUri()); // Загружаем файл с диска

        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("Image file not found: " + imageModel.getImagePath());
        }
        return resource; // Возвращаем файл как ресурс
    }

    public Resource getImageToPost(Long postId) throws IOException {
        ImageModel imageModel = imageRepository.findByPostId(postId)
                .orElseThrow(() -> new ImageNotFoundException("Cannot find image for PostService"));

        Path filePath = Paths.get(UPLOAD_DIR + imageModel.getImagePath());
        Resource resource = new UrlResource(filePath.toUri()); // Загружаем файл с диска

        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("Image file not found: " + imageModel.getImagePath());
        }

        return resource; // Возвращаем файл как ресурс
    }

    public Resource getImageToUser(String username) throws IOException {
        User user = userRepository.findByUsername(username).get();

        ImageModel imageModel = imageRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ImageNotFoundException("Cannot find image for PostService"));

        Path filePath = Paths.get(UPLOAD_DIR + imageModel.getImagePath());
        Resource resource = new UrlResource(filePath.toUri()); // Загружаем файл с диска

        if (!resource.exists() || !resource.isReadable()) {
            throw new FileNotFoundException("Image file not found: " + imageModel.getImagePath());
        }

        return resource; // Возвращаем файл как ресурс
    }

    private User getUserByPrincipal(Principal principal) {
        String username = principal.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("username not found with username" + username));
    }


    private <T> Collector<T, ?, T> toSinglePostCollector() {
        return Collectors.collectingAndThen(
                Collectors.toList(),
                list -> {
                    if (list.size() != 1) {
                        throw new IllegalStateException();
                    }
                    return list.get(0);
                }
        );
    }
}
