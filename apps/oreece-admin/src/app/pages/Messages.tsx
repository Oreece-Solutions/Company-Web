import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, Textarea, Avatar, AvatarFallback, AvatarImage } from '@company-web/shared/ui';
import { Send, MessageSquare, Clock, Search, Filter } from 'lucide-react';

export function Messages() {
  const conversations = [
    {
      id: 1,
      customerName: 'John Smith',
      company: 'Tech Solutions Inc.',
      projectName: 'E-commerce Platform',
      lastMessage: 'The design mockups are ready for your review.',
      timestamp: '2 hours ago',
      unread: true,
      priority: 'High'
    },
    {
      id: 2,
      customerName: 'Sarah Johnson',
      company: 'StartupXYZ',
      projectName: 'Mobile App Development',
      lastMessage: 'We need to discuss the API integration timeline.',
      timestamp: '1 day ago',
      unread: false,
      priority: 'Medium'
    },
    {
      id: 3,
      customerName: 'Mike Wilson',
      company: 'Enterprise Corp',
      projectName: 'Database Migration',
      lastMessage: 'The migration plan has been updated.',
      timestamp: '3 days ago',
      unread: false,
      priority: 'Low'
    }
  ];

  const messages = [
    {
      id: 1,
      sender: 'John Smith',
      role: 'Client',
      content: 'The design mockups are ready for your review. Please let me know your thoughts.',
      timestamp: '2 hours ago',
      isFromCustomer: true
    },
    {
      id: 2,
      sender: 'You',
      role: 'Admin',
      content: 'The designs look great! I have a few minor suggestions for the checkout flow.',
      timestamp: '1 hour ago',
      isFromCustomer: false
    },
    {
      id: 3,
      sender: 'John Smith',
      role: 'Client',
      content: 'Perfect! I\'ll share your feedback with the design team and get back to you with the updated mockups.',
      timestamp: '30 minutes ago',
      isFromCustomer: true
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600">Communicate with customers and manage project discussions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Conversations</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
                        {conversation.customerName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.customerName}
                        </p>
                        <div className="flex items-center space-x-1">
                          {conversation.unread && (
                            <Badge variant="destructive" className="text-xs">
                              New
                            </Badge>
                          )}
                          <Badge variant={getPriorityColor(conversation.priority)} className="text-xs">
                            {conversation.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{conversation.company}</p>
                      <p className="text-xs text-blue-600 font-medium">{conversation.projectName}</p>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>John Smith - E-commerce Platform</CardTitle>
                  <CardDescription>Tech Solutions Inc.</CardDescription>
                </div>
                <Badge variant="destructive">High Priority</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isFromCustomer
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
