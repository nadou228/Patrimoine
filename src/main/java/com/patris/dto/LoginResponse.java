package com.patris.dto;

import lombok.AllArgsConstructor;
import lombok.Data;


@Data
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String username;
    private String nom;
    private String role;
    private String token;
}