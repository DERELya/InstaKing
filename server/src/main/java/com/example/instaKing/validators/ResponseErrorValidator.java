package com.example.instaKing.validators;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class ResponseErrorValidator {

    public ResponseEntity<Object> mapValidationService(BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            Map<String, String> errorMap = new HashMap<>();

            if (!CollectionUtils.isEmpty(bindingResult.getAllErrors())) {
                for (ObjectError objectError : bindingResult.getAllErrors()) {
                    errorMap.put(objectError.getCode(), objectError.getDefaultMessage());
                }
            }
            for (FieldError fieldError : bindingResult.getFieldErrors()) {
                errorMap.put(fieldError.getField(), fieldError.getDefaultMessage());
            }
            return new ResponseEntity<>(errorMap, HttpStatus.BAD_REQUEST);
        }
        return null;
    }
}
