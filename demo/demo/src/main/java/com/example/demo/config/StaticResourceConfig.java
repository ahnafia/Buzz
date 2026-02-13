package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve profile images from /profiles/** URLs
        registry.addResourceHandler("/profiles/**")
                .addResourceLocations("classpath:/static/profiles/", "file:profiles/");
        
        // Serve event images from /events/** URLs
        registry.addResourceHandler("/events/**")
                .addResourceLocations("classpath:/static/events/", "file:events/");
        
        // Serve general images from /images/** URLs
        registry.addResourceHandler("/images/**")
                .addResourceLocations("classpath:/static/images/", "file:images/");
    }
}