package com.phishing.scanner_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ScannerAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(ScannerAppApplication.class, args);
	}

}
