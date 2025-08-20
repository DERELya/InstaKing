package com.example.instaKing.services;

import com.example.instaKing.models.User;
import com.example.instaKing.models.UserDocument;
import com.example.instaKing.repositories.UserDocumentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.xcontent.XContentType;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchTemplate;
import org.springframework.stereotype.Service;


import java.io.IOException;
import java.util.List;

@Service

public class UserSearchService {
    private final static String INDEX_NAME = "users";
    private final ObjectMapper objectMapper;
    private final RestHighLevelClient elasticSearchClient;
    private final ElasticsearchTemplate elasticsearchTemplate;
    private final UserDocumentRepository repository;

    public UserSearchService(ObjectMapper objectMapper, RestHighLevelClient elasticSearchClient, ElasticsearchTemplate elasticsearchTemplate, UserDocumentRepository repository) {
        this.objectMapper = objectMapper;
        this.elasticSearchClient = elasticSearchClient;
        this.elasticsearchTemplate = elasticsearchTemplate;
        this.repository = repository;
    }
    public void updateUsers(User user) throws IOException {
        UserDocument userDocument = new UserDocument();
        userDocument.setId(user.getId());
        userDocument.setFirstName(user.getFirstname());
        userDocument.setLastName(user.getLastname());
        userDocument.setUsername(user.getUsername());

        IndexRequest indexRequest = new IndexRequest(INDEX_NAME);
        indexRequest.id(String.valueOf(userDocument.getId()));
        indexRequest.source(objectMapper.writeValueAsString(userDocument), XContentType.JSON);
        elasticSearchClient.index(indexRequest, RequestOptions.DEFAULT);
    }

}
