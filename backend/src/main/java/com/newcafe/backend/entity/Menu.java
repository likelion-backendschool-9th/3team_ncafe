package com.newcafe.backend.entity;

import jakarta.persistence.*;
import lombok.*; // 롬복을 설치 한 사람만 사용할 것

@Entity
@Table(name = "menus")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "kor_name", nullable = false)
    private String korName;

    @Column(name = "eng_name", nullable = false)
    private String engName;

    @Column(name = "price", nullable = false)
    private Integer price;
}