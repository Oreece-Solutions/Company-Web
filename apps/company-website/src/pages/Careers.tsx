import { Navigation, BackToTop, AnimatedSection } from "@company-web/features";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@company-web/shared/ui";
import { MapPin, Clock, Users, Code, Briefcase, GraduationCap, Star } from "lucide-react";

const Careers = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30 animate-pulse" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-primary/5 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/8 rounded-full animate-float-medium" />
      </div>
      
      <Navigation />
      
      <main className="pt-28 pb-16 relative z-10">
        <div className="container mx-auto px-6 lg:px-8">
          {/* Hero Section */}
          <AnimatedSection className="text-center mb-16">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                Build the Future with Oreece
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                We're looking for talented individuals to join our innovative team and help shape the future of technology
              </p>
            </div>
          </AnimatedSection>

          {/* Job Opening */}
          <AnimatedSection className="max-w-4xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl shadow-primary/10">
              <CardHeader className="pb-8">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                      Software Engineering Intern
                    </CardTitle>
                    <CardDescription className="text-lg text-gray-600">
                      Join our engineering team and gain hands-on experience in modern web development
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-0">
                    Open
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    Remote / Hybrid
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    3-6 months
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Engineering Team
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* About the Role */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-primary" />
                    About the Role
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    As a Software Engineering Intern at Oreece, you'll work alongside experienced developers to build 
                    cutting-edge web applications. You'll gain exposure to modern technologies including React, TypeScript, 
                    Node.js, and cloud platforms while contributing to real projects that impact our clients.
                  </p>
                </div>

                {/* Requirements */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                    Requirements
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Currently pursuing a degree in Computer Science, Software Engineering, or related field
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Basic knowledge of HTML, CSS, and JavaScript
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Familiarity with React or other modern JavaScript frameworks (preferred)
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Strong problem-solving skills and attention to detail
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Excellent communication skills and ability to work in a team
                    </li>
                    <li className="flex items-start">
                      <Star className="h-4 w-4 mr-3 mt-0.5 text-yellow-500" />
                      Eagerness to learn new technologies and best practices
                    </li>
                  </ul>
                </div>

                {/* What You'll Learn */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Code className="h-5 w-5 mr-2 text-primary" />
                    What You'll Learn
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Frontend Development</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• React & TypeScript</li>
                        <li>• Modern CSS & Tailwind</li>
                        <li>• State Management</li>
                        <li>• Performance Optimization</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Backend & Tools</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• API Development</li>
                        <li>• Database Design</li>
                        <li>• Version Control (Git)</li>
                        <li>• Deployment & DevOps</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    What We Offer
                  </h3>
                  <div className="bg-gradient-to-r from-primary/10 to-brand-red-dark/10 rounded-xl p-6">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Competitive internship stipend
                        </div>
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Mentorship from senior developers
                        </div>
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Flexible working hours
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Real project experience
                        </div>
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Potential for full-time offer
                        </div>
                        <div className="flex items-center text-gray-700">
                          <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                          Professional development opportunities
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application */}
                <div className="text-center pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Ready to Start Your Journey?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Send us your resume and a brief cover letter explaining why you're interested in this position.
                  </p>
                  <Button 
                    size="lg" 
                    className="btn-hero px-8 py-3 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => window.location.href = 'mailto:careers@oreece.com?subject=Software Engineering Intern Application'}
                  >
                    Apply Now
                  </Button>
                  <p className="text-sm text-gray-500 mt-4">
                    Email: careers@oreece.com
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </main>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Careers;