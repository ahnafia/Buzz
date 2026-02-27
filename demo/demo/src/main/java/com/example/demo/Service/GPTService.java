package com.example.demo.Service;

import com.example.demo.Models.*;
import com.example.demo.config.GPTConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Service
public class GPTService {
    
    private static final Logger logger = LoggerFactory.getLogger(GPTService.class);
    
    private final WebClient webClient;
    private final GPTConfig gptConfig;
    
    @Autowired
    public GPTService(GPTConfig gptConfig) {
        this.gptConfig = gptConfig;
        this.webClient = WebClient.builder()
                .baseUrl(gptConfig.getBaseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + gptConfig.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
    
    /**
     * Determines if event content is relevant to the search query using GPT API
     * @param query The user's search query
     * @param eventContent The combined event content (title, description, etc.)
     * @return true if the event is relevant, false otherwise
     */
    public boolean isContentRelevant(String query, String eventContent) {
        try {
            String prompt = buildPrompt(query, eventContent);
            GPTRelevanceRequest request = createGPTRequest(prompt);
            
            GPTRelevanceResponse response = webClient
                    .post()
                    .uri("/chat/completions")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(GPTRelevanceResponse.class)
                    .timeout(Duration.ofSeconds(gptConfig.getTimeoutSeconds()))
                    .block();
            
            return parseRelevanceResponse(response);
            
        } catch (WebClientResponseException e) {
            logger.error("GPT API request failed with status: {} and body: {}", 
                    e.getStatusCode(), e.getResponseBodyAsString());
            return false; // Default to not relevant on API failure
        } catch (Exception e) {
            logger.error("Error calling GPT API for relevance check", e);
            return false; // Default to not relevant on any error
        }
    }
    
    /**
     * Builds the prompt for GPT to determine event relevance
     */
    private String buildPrompt(String query, String eventContent) {
        return String.format(
            "Determine if the following event is relevant to the search query. " +
            "Respond with only 'YES' if the event is semantically related to the query, " +
            "or 'NO' if it is not related.\n\n" +
            "Search Query: %s\n\n" +
            "Event Content: %s\n\n" +
            "Response:",
            query, eventContent
        );
    }
    
    /**
     * Creates a GPT API request object
     */
    private GPTRelevanceRequest createGPTRequest(String prompt) {
        List<GPTMessage> messages = Arrays.asList(
            new GPTMessage("user", prompt)
        );
        
        return new GPTRelevanceRequest(
            gptConfig.getModel(),
            messages,
            gptConfig.getMaxTokens(),
            gptConfig.getTemperature()
        );
    }
    
    /**
     * Parses the GPT response to determine relevance
     */
    private boolean parseRelevanceResponse(GPTRelevanceResponse response) {
        if (response == null || response.getChoices() == null || response.getChoices().isEmpty()) {
            logger.warn("Invalid GPT response: null or empty choices");
            return false;
        }
        
        GPTChoice firstChoice = response.getChoices().get(0);
        if (firstChoice.getMessage() == null || firstChoice.getMessage().getContent() == null) {
            logger.warn("Invalid GPT response: null message content");
            return false;
        }
        
        String content = firstChoice.getMessage().getContent().trim().toUpperCase();
        logger.debug("GPT response content: {}", content);
        
        // Check if response contains YES (indicating relevance)
        return content.contains("YES");
    }
}