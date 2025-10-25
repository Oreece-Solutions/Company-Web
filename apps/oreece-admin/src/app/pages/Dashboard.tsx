import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Progress } from '@company-web/shared/ui';
import { 
  Users, 
  FolderOpen, 
  MessageSquare, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function Dashboard() {
  const stats = [
    {
      title: 'Total Projects',
      value: '24',
      change: '+12%',
      icon: FolderOpen,
      color: 'text-blue-500'
    },
    {
      title: 'Active Customers',
      value: '18',
      change: '+8%',
      icon: Users,
      color: 'text-green-500'
    },
    {
      title: 'Messages',
      value: '47',
      change: '+23%',
      icon: MessageSquare,
      color: 'text-purple-500'
    },
    {
      title: 'Revenue',
      value: '$45,230',
      change: '+15%',
      icon: TrendingUp,
      color: 'text-orange-500'
    }
  ];

  const recentProjects = [
    {
      id: 1,
      name: 'E-commerce Platform',
      client: 'Tech Solutions Inc.',
      status: 'In Progress',
      progress: 75,
      dueDate: '2024-02-15',
      priority: 'High'
    },
    {
      id: 2,
      name: 'Mobile App Development',
      client: 'StartupXYZ',
      status: 'Review',
      progress: 90,
      dueDate: '2024-01-30',
      priority: 'Medium'
    },
    {
      id: 3,
      name: 'Database Migration',
      client: 'Enterprise Corp',
      status: 'Planning',
      progress: 25,
      dueDate: '2024-03-01',
      priority: 'Low'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Review':
        return <CheckCircle className="w-4 h-4 text-yellow-500" />;
      case 'Planning':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of your business operations and project status.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-green-600">{stat.change} from last month</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Latest project updates and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{project.name}</h4>
                    {getStatusIcon(project.status)}
                    <Badge variant={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{project.client}</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.progress} className="w-20" />
                    <span className="text-xs text-gray-500">{project.progress}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Due: {new Date(project.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50">
                <div className="font-medium">New Project</div>
                <div className="text-sm text-gray-500">Create a new project</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50">
                <div className="font-medium">Add Customer</div>
                <div className="text-sm text-gray-500">Register new client</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50">
                <div className="font-medium">Send Message</div>
                <div className="text-sm text-gray-500">Contact customer</div>
              </button>
              <button className="p-3 text-left border rounded-lg hover:bg-gray-50">
                <div className="font-medium">Generate Report</div>
                <div className="text-sm text-gray-500">View analytics</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
