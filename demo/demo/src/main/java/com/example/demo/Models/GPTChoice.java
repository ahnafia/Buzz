package com.example.demo.Models;

public class GPTChoice {
    private GPTMessage message;
    private String finish_reason;
    private int index;
    
    public GPTChoice() {}
    
    public GPTMessage getMessage() {
        return message;
    }
    
    public void setMessage(GPTMessage message) {
        this.message = message;
    }
    
    public String getFinish_reason() {
        return finish_reason;
    }
    
    public void setFinish_reason(String finish_reason) {
        this.finish_reason = finish_reason;
    }
    
    public int getIndex() {
        return index;
    }
    
    public void setIndex(int index) {
        this.index = index;
    }
}