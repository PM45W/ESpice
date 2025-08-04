import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Download, 
  Zap, 
  Shield, 
  BarChart3, 
  FileText, 
  Cpu,
  CheckCircle,
  Star
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "PDF Datasheet Processing",
      description: "Extract text, tables, and parameters from semiconductor datasheets with advanced OCR technology."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Curve Extraction",
      description: "Automatically extract I-V curves from datasheet graphs using advanced image processing algorithms."
    },
    {
      icon: <Cpu className="h-6 w-6" />,
      title: "SPICE Model Generation",
      description: "Generate accurate SPICE models for GaN-HEMT, SiC-MOSFET, and Si-MOSFET devices."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Parameter Management",
      description: "Store, edit, and manage extracted semiconductor parameters with validation and optimization."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "High Performance",
      description: "Native desktop application with Rust backend for lightning-fast processing and analysis."
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export Functionality",
      description: "Export SPICE models to LTSpice, KiCad, and other major EDA tools."
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Senior Engineer",
      company: "Semiconductor Corp",
      content: "ESpice has revolutionized our SPICE model generation process. The accuracy and speed are incredible.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Design Engineer",
      company: "Tech Innovations",
      content: "The curve extraction feature saves us hours of manual work. Highly recommended for any semiconductor team.",
      rating: 5
    },
    {
      name: "Dr. James Wilson",
      role: "Research Director",
      company: "University Lab",
      content: "Perfect for academic research. The parameter management system is intuitive and powerful.",
      rating: 5
    }
  ];

  return (
    <>
      <Helmet>
        <title>ESpice - Professional SPICE Model Generator for Semiconductor Devices</title>
        <meta name="description" content="Generate accurate SPICE models from semiconductor datasheets with advanced AI-powered extraction and processing." />
        <meta name="keywords" content="SPICE, semiconductor, model generation, datasheet, GaN, SiC, MOSFET, HEMT" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Star className="h-3 w-3 mr-1" />
                Professional Grade
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Generate SPICE Models
                <span className="text-blue-600 dark:text-blue-400"> Instantly</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Transform semiconductor datasheets into accurate SPICE models with AI-powered extraction. 
                Support for GaN-HEMT, SiC-MOSFET, and Si-MOSFET devices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link to="/download">
                    <Download className="h-5 w-5 mr-2" />
                    Download Now
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
                  <Link to="/docs">
                    View Documentation
                  </Link>
                </Button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Semiconductor Engineers
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to extract, process, and generate accurate SPICE models from semiconductor datasheets.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Engineers Worldwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what professionals are saying about ESpice
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of engineers who are already using ESpice to generate accurate SPICE models faster than ever.
            </p>
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
              <Link to="/download">
                <Download className="h-5 w-5 mr-2" />
                Download ESpice Now
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default HomePage; 