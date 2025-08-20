package com.example.instaKing.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Document(indexName = "users")
@Getter
@Setter
public class UserDocument {
    @Id
    private Long id;

    @Field(type = FieldType.Text, analyzer = "standard",scalingFactor = 2.0)
    private String username;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String firstName;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String lastName;

    public UserDocument() {
    }

    public UserDocument(User user) {
        this.firstName=user.getFirstname();
        this.username = user.getUsername();
        this.lastName=user.getLastname();
        this.id=user.getId();
    }
}
