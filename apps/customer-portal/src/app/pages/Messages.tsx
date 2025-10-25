import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, Textarea, Avatar, AvatarFallback, AvatarImage } from '@company-web/shared/ui';
import { Send, MessageSquare, Clock } from 'lucide-react';

export function Messages() {
  const conversations = [
    {
      id: 1,
      projectName: 'E-commerce Website',
      lastMessage: 'The design mockups are ready for your review.',
      timestamp: '2 hours ago',
      unread: true,
      sender: 'John Doe',
      senderRole: 'Project Manager'
    },
    {
      id: 2,
      projectName: 'Mobile App Development',
      lastMessage: 'We need to discuss the API integration timeline.',
      timestamp: '1 day ago',
      unread: false,
      sender: 'Sarah Wilson',
      senderRole: 'Lead Developer'
    },
    {
      id: 3,
      projectName: 'Database Migration',
      lastMessage: 'The migration plan has been updated.',
      timestamp: '3 days ago',
      unread: false,
      sender: 'Mike Johnson',
      senderRole: 'Database Administrator'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'John Doe',
      role: 'Project Manager',
      content: 'The design mockups are ready for your review. Please let me know your thoughts.',
      timestamp: '2 hours ago',
      isFromTeam: true
    },
    {
      id: 2,
      sender: 'You',
      role: 'Client',
      content: 'The designs look great! I have a few minor suggestions for the checkout flow.',
      timestamp: '1 hour ago',
      isFromTeam: false
    },
    {
      id: 3,
      sender: 'John Doe',
      role: 'Project Manager',
      content: 'Perfect! I\'ll share your feedback with the design team and get back to you with the updated mockups.',
      timestamp: '30 minutes ago',
      isFromTeam: true
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">Communicate with your project team and track conversations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Conversations</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                    conversation.unread ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {conversation.sender.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.projectName}
                        </p>
                        {conversation.unread && (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{conversation.sender}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{conversation.timestamp}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>E-commerce Website</CardTitle>
              <CardDescription>Project Manager: John Doe</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromTeam ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isFromTeam
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-blue-500 text-white'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.sender}
                        </span>
                        <span className="text-xs opacity-75">
                          {message.role}
                        </span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Type your message..."
                    className="flex-1"
                    rows={2}
                  />
                  <Button size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
