package com.HealthLink.service.chat;

import java.util.List;

public interface PresenceService {
    void userConnected(String userId);
    void userDisconnected(String userId);
    boolean isUserOnline(String userId);
    List<String> getOnlineUsers();
}
