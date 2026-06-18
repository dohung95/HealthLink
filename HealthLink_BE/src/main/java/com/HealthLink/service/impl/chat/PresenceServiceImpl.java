package com.HealthLink.service.impl.chat;

import com.HealthLink.service.chat.PresenceService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceServiceImpl implements PresenceService {

    // Store user connection state in memory (Assuming single-node for now)
    private final Map<String, Boolean> connectedUsers = new ConcurrentHashMap<>();

    @Override
    public void userConnected(String userId) {
        if (userId != null && !userId.isBlank()) {
            connectedUsers.put(userId, true);
        }
    }

    @Override
    public void userDisconnected(String userId) {
        if (userId != null && !userId.isBlank()) {
            connectedUsers.remove(userId);
        }
    }

    @Override
    public boolean isUserOnline(String userId) {
        if (userId == null || userId.isBlank()) return false;
        return connectedUsers.getOrDefault(userId, false);
    }

    @Override
    public List<String> getOnlineUsers() {
        return new ArrayList<>(connectedUsers.keySet());
    }
}
