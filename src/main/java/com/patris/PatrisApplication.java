package com.patris;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PatrisApplication {
    public static void main(String[] args) {
        SpringApplication.run(PatrisApplication.class, args);
    }
} 