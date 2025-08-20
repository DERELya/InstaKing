package com.example.instaKing.repositories;

import com.example.instaKing.models.UserDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface UserDocumentRepository extends ElasticsearchRepository<UserDocument, String> {
    List<UserDocument> findByUsernameContaining(String username);
    List<UserDocument> findByFirstNameAndLastNameContaining(String query);
}
