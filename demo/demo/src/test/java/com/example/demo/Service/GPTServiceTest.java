package com.example.demo.Service;

import com.example.demo.Models.*;
import com.example.demo.config.GPTConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GPTServiceTest {
    
    private MockWebServer mockWebServer;
    private GPTService gptService;
    private GPTConfig gptConfig;
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();
        
        gptConfig = new GPTConfig();
        gptConfig.setApiKey("test-api-key");
        gptConfig.setModel("gpt-3.5-turbo");
        gptConfig.setMaxTokens(150);
        gptConfig.setTemperature(0.1);
        gptConfig.setBaseUrl(mockWebServer.url("/").toString().replaceAll("/$", ""));
        gptConfig.setTimeoutSeconds(10);
        
        gptService = new GPTService(gptConfig);
        objectMapper = new ObjectMapper();
    }
    
    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }
    
    @Test
    void testIsContentRelevant_ReturnsTrue_WhenGPTResponseIsYes() throws Exception {
        // Arrange
        GPTRelevanceResponse mockResponse = createMockGPTResponse("YES");
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance at downtown venue");
        
        // Assert
        assertTrue(result);
        
        // Verify request
        RecordedRequest recordedRequest = mockWebServer.takeRequest();
        assertEquals("POST", recordedRequest.getMethod());
        assertEquals("/chat/completions", recordedRequest.getPath());
        assertEquals("Bearer test-api-key", recordedRequest.getHeader("Authorization"));
        assertEquals("application/json", recordedRequest.getHeader("Content-Type"));
        
        // Verify request body
        GPTRelevanceRequest requestBody = objectMapper.readValue(
                recordedRequest.getBody().readUtf8(), GPTRelevanceRequest.class);
        assertEquals("gpt-3.5-turbo", requestBody.getModel());
        assertEquals(150, requestBody.getMax_tokens());
        assertEquals(0.1, requestBody.getTemperature(), 0.001);
        assertEquals(1, requestBody.getMessages().size());
        assertEquals("user", requestBody.getMessages().get(0).getRole());
        assertTrue(requestBody.getMessages().get(0).getContent().contains("music concert"));
        assertTrue(requestBody.getMessages().get(0).getContent().contains("Live jazz performance"));
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenGPTResponseIsNo() throws Exception {
        // Arrange
        GPTRelevanceResponse mockResponse = createMockGPTResponse("NO");
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Basketball game at sports arena");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenGPTResponseContainsYesInLargerText() throws Exception {
        // Arrange
        GPTRelevanceResponse mockResponse = createMockGPTResponse("YES, this event is relevant");
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertTrue(result); // Should still return true as it contains "YES"
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenAPIReturns4xxError() {
        // Arrange
        mockWebServer.enqueue(new MockResponse().setResponseCode(400).setBody("Bad Request"));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenAPIReturns5xxError() {
        // Arrange
        mockWebServer.enqueue(new MockResponse().setResponseCode(500).setBody("Internal Server Error"));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenResponseIsNull() throws Exception {
        // Arrange
        mockWebServer.enqueue(new MockResponse()
                .setBody("null")
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenResponseHasEmptyChoices() throws Exception {
        // Arrange
        GPTRelevanceResponse mockResponse = new GPTRelevanceResponse();
        mockResponse.setChoices(Arrays.asList());
        
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_ReturnsFalse_WhenMessageContentIsNull() throws Exception {
        // Arrange
        GPTChoice choice = new GPTChoice();
        choice.setMessage(new GPTMessage("assistant", null));
        
        GPTRelevanceResponse mockResponse = new GPTRelevanceResponse();
        mockResponse.setChoices(Arrays.asList(choice));
        
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertFalse(result);
    }
    
    @Test
    void testIsContentRelevant_HandlesCaseInsensitiveResponse() throws Exception {
        // Arrange
        GPTRelevanceResponse mockResponse = createMockGPTResponse("yes");
        mockWebServer.enqueue(new MockResponse()
                .setBody(objectMapper.writeValueAsString(mockResponse))
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE));
        
        // Act
        boolean result = gptService.isContentRelevant("music concert", "Live jazz performance");
        
        // Assert
        assertTrue(result);
    }
    
    private GPTRelevanceResponse createMockGPTResponse(String content) {
        GPTMessage message = new GPTMessage("assistant", content);
        GPTChoice choice = new GPTChoice();
        choice.setMessage(message);
        choice.setFinish_reason("stop");
        choice.setIndex(0);
        
        GPTRelevanceResponse response = new GPTRelevanceResponse();
        response.setId("chatcmpl-test");
        response.setObject("chat.completion");
        response.setCreated(System.currentTimeMillis() / 1000);
        response.setModel("gpt-3.5-turbo");
        response.setChoices(Arrays.asList(choice));
        
        return response;
    }
}