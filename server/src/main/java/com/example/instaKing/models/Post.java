package com.example.instaKing.models;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Data
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String caption;

    private String location;

    private int liked;

    @Column()
    @ElementCollection(targetClass = String.class)
    private Set<String> likedUser= new HashSet<>();

    @ManyToOne()
    private User user;
    @OneToMany(cascade = CascadeType.REFRESH, fetch = FetchType.EAGER,mappedBy = "post",orphanRemoval = true)
    private List<Comment> comments=new ArrayList<>();
    @Column(updatable = false)
    private LocalDateTime createdAt;


    @PrePersist
    protected void onCreate(){
        this.createdAt = LocalDateTime.now();
    }
}
