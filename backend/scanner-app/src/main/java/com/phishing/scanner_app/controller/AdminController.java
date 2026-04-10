package com.phishing.scanner_app;
@RestController
@RequestMapping("/admin")
public class AdminController {
    @preAuthorize("hasRole('Admin')")
    @GetMapping("/dashboard")
    public String adminOnly() {
        return "Admin content";
    }
}