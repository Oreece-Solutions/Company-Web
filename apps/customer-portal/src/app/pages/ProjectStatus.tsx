import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Progress, Button } from '@company-web/shared/ui';
import { CheckCircle, Clock, AlertCircle, Calendar, User } from 'lucide-react';

export function ProjectStatus() {
  const projects = [
    {
      id: 1,
      name: 'E-commerce Website',
      description: 'Full-stack e-commerce platform with payment integration',
      status: 'In Progress',
      progress: 75,
      dueDate: '2024-02-15',
      priority: 'High',
      team: ['John Doe', 'Jane Smith', 'Mike Johnson'],
      milestones: [
        { name: 'Design Phase', completed: true, date: '2024-01-15' },
        { name: 'Frontend Development', completed: true, date: '2024-01-30' },
        { name: 'Backend Development', completed: false, date: '2024-02-10' },
        { name: 'Testing & Deployment', completed: false, date: '2024-02-15' }
      ]
    },
    {
      id: 2,
      name: 'Mobile App Development',
      description: 'Cross-platform mobile application for iOS and Android',
      status: 'Review',
      progress: 90,
      dueDate: '2024-01-30',
      priority: 'Medium',
      team: ['Sarah Wilson', 'Tom Brown'],
      milestones: [
        { name: 'UI/UX Design', completed: true, date: '2024-01-10' },
        { name: 'Core Features', completed: true, date: '2024-01-20' },
        { name: 'Testing', completed: true, date: '2024-01-25' },
        { name: 'App Store Submission', completed: false, date: '2024-01-30' }
      ]
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
        <h1 className="text-3xl font-bold text-gray-900">Project Status</h1>
        <p className="text-gray-600">Track the progress of your projects and milestones.</p>
      </div>

      <div className="space-y-6">
        {projects.map((project) => (
          <Card key={project.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="mt-1">{project.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(project.status)}
                  <Badge variant={getPriorityColor(project.priority)}>
                    {project.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Team: {project.team.length} members</span>
                </div>
                <div className="text-sm text-gray-600">
                  Status: <span className="font-medium">{project.status}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="w-full" />
              </div>

              <div>
                <h4 className="font-medium mb-3">Project Milestones</h4>
                <div className="space-y-2">
                  {project.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        {milestone.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm ${milestone.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                          {milestone.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(milestone.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
