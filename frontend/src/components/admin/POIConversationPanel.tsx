import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { adminPoiService, ConversationMessage } from '@/services/adminPoiService';

interface POIConversationPanelProps {
  poiId: string;
  conversationId?: string;
  className?: string;
}

export function POIConversationPanel({ poiId, conversationId, className }: POIConversationPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'partner'>('partner');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { userRoles } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (userRoles.includes('admin')) {
      setUserRole('admin');
    } else {
      setUserRole('partner');
    }
  }, [userRoles]);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();
  }, [conversationId]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const data = await adminPoiService.getConversationMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la conversation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    setIsSending(true);
    try {
      await adminPoiService.sendConversationMessage(conversationId, {
        content: newMessage.trim(),
      });
      fetchMessages();
      setNewMessage('');
      toast({
        title: "Message envoyé",
        description: `Votre message a été envoyé ${userRole === 'admin' ? 'au partenaire' : 'à l\'équipe'}`,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'status_change': return 'Changement de statut';
      case 'request_info': return 'Demande d\'information';
      case 'justification': return 'Justification';
      default: return 'Commentaire';
    }
  };

  const getMessageTypeBadge = (type: string) => {
    switch (type) {
      case 'status_change': return 'destructive';
      case 'request_info': return 'secondary';
      case 'justification': return 'secondary';
      default: return 'outline';
    }
  };

  if (!conversationId) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8 text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune conversation pour ce POI</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {userRole === 'admin' ? 'Conversation avec le partenaire' : 'Discussion avec l\'équipe'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <div className="max-h-96 overflow-y-auto space-y-3 p-2 border rounded-lg">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Chargement de la conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Aucun message dans cette conversation
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === userRole ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender_type === userRole
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.sender_type === 'admin' ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="text-xs font-medium">
                        {message.sender_type === 'admin' ? 'Admin' : 
                         message.sender_detail?.profile
                           ? `${message.sender_detail.profile.first_name || ''} ${message.sender_detail.profile.last_name || ''}`.trim() || 'Partenaire'
                           : message.sender_detail?.display_name || 'Partenaire'}
                      </span>
                      {message.message_type !== 'comment' && (
                        <Badge variant={getMessageTypeBadge(message.message_type) as any} className="text-xs">
                          {getMessageTypeLabel(message.message_type)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_type === userRole
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {formatDistanceToNow(new Date(message.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-1" />
              {isSending ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
