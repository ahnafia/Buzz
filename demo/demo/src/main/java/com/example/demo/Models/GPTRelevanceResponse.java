package com.example.demo.Models;

import java.util.List;

public class GPTRelevanceResponse {
    private String id;
    private String object;
    private long created;
    private String model;
    private List<GPTChoice> choices;
    
    public GPTRelevanceResponse() {}
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getObject() {
        return object;
    }
    
    public void setObject(String object) {
        this.object = object;
    }
    
    public long getCreated() {
        return created;
    }
    
    public void setCreated(long created) {
        this.created = created;
    }
    
    public String getModel() {
        return model;
    }
    
    public void setModel(String model) {
        this.model = model;
    }
    
    public List<GPTChoice> getChoices() {
        return choices;
    }
    
    public void setChoices(List<GPTChoice> choices) {
        this.choices = choices;
    }
}