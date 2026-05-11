package com.phishing.scanner_app.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.security.Principal;

@RestController
@RequestMapping("/user")
public class UserController {

    @GetMapping("/profile")
    public String userContent(Principal principal) {
        return "User profile for UUID: " + principal.getName();
    }
}
