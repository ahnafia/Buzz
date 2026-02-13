package com.example.demo.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

@Service
public class SupabaseStorageService {
    
    private static final Logger log = LoggerFactory.getLogger(SupabaseStorageService.class);
    
    @Value("${supabase.url}")
    private String supabaseUrl;
    
    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;
    
    private final WebClient webClient;
    
    public SupabaseStorageService() {
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
                .build();
    }
    
    /**
     * Generate a signed URL for a file in Supabase Storage
     * @param bucketName The storage bucket name (e.g., "media")
     * @param filePath The file path (e.g., "profiles/167501_00_2x.jpg")
     * @param expiresInSeconds How long the URL should be valid (60-300 seconds)
     * @return The signed URL or null if generation fails
     */
    public String generateSignedUrl(String bucketName, String filePath, int expiresInSeconds) {
        if (filePath == null || filePath.trim().isEmpty()) {
            log.warn("File path is null or empty");
            return null;
        }
        
        try {
            String url = String.format("%s/storage/v1/object/sign/%s/%s", 
                    supabaseUrl, bucketName, filePath);
            
            Map<String, Object> requestBody = Map.of("expiresIn", expiresInSeconds);
            
            log.info("Attempting to generate signed URL for: {}/{}", bucketName, filePath);
            log.info("Request URL: {}", url);
            log.info("Service role key starts with: {}", serviceRoleKey != null && serviceRoleKey.length() > 10 ? serviceRoleKey.substring(0, 10) + "..." : "null or too short");
            
            Mono<Map> response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey)
                    .header("apikey", serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(), clientResponse -> {
                        log.error("HTTP error response: {}", clientResponse.statusCode());
                        return clientResponse.bodyToMono(String.class)
                                .doOnNext(body -> log.error("Error response body: {}", body))
                                .then(Mono.error(new RuntimeException("HTTP " + clientResponse.statusCode())));
                    })
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5));
            
            Map<String, Object> result = response.block();
            
            if (result != null && result.containsKey("signedURL")) {
                String signedUrlPath = result.get("signedURL").toString();
                // The signedURL from Supabase is a relative path, we need to add the full storage URL
                String signedUrl = supabaseUrl + "/storage/v1" + signedUrlPath;
                log.info("Generated signed URL successfully: {}", signedUrl);
                return signedUrl;
            } else {
                log.error("Failed to generate signed URL - no signedURL in response: {}", result);
                return null;
            }
            
        } catch (Exception e) {
            log.error("Error generating signed URL for {}/{}: {} - {}", bucketName, filePath, e.getClass().getSimpleName(), e.getMessage());
            if (e.getCause() != null) {
                log.error("Caused by: {} - {}", e.getCause().getClass().getSimpleName(), e.getCause().getMessage());
            }
            
            // For development: if file doesn't exist, return a placeholder URL or null
            if (e.getMessage() != null && e.getMessage().contains("not_found")) {
                log.info("File not found in storage, this is expected for testing. Returning null.");
                return null;
            }
            
            return null;
        }
    }
    
    /**
     * Generate a signed URL for a profile image with default 5-minute expiry
     * Handles paths in format "BucketName/filename.jpg"
     */
    public String generateProfileImageUrl(String profileImagePath) {
        log.info("generateProfileImageUrl called with path: '{}'", profileImagePath);
        if (profileImagePath == null) {
            log.info("Profile image path is null, returning null");
            return null;
        }
        
        // Parse bucket and file path from format "BucketName/filename.jpg"
        String[] pathParts = profileImagePath.split("/", 2);
        if (pathParts.length != 2) {
            log.error("Invalid profile image path format. Expected 'BucketName/filename', got: '{}'", profileImagePath);
            return null;
        }
        
        String bucketName = pathParts[0];  // e.g., "Media"
        String filePath = pathParts[1];    // e.g., "167501_00_2x.jpg"
        
        log.info("Parsed bucket: '{}', file: '{}'", bucketName, filePath);
        log.info("Supabase URL: {}", supabaseUrl);
        log.info("Service role key configured: {}", serviceRoleKey != null && !serviceRoleKey.isEmpty() ? "Yes" : "No");
        
        String result = generateSignedUrl(bucketName, filePath, 300); // 5 minutes
        log.info("Generated signed URL result: {}", result != null ? "Success" : "Failed");
        
        // For development: if signed URL generation fails, return a placeholder
        if (result == null) {
            log.info("Signed URL generation failed, returning placeholder URL for development");
            // Return a placeholder image URL for development
            return "https://via.placeholder.com/150x150/cccccc/666666?text=No+Image";
        }
        
        return result;
    }
}