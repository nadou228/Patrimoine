package com.patris.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String username;
    private String nom;
    private String role;
    private String token;
    /** Codes de permissions effectifs (rôle + surcharges utilisateur). */
    private List<String> permissions = new ArrayList<>();
}
