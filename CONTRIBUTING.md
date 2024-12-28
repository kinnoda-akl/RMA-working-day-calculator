## Contributing

We welcome contributions that help make the RMA Working Days Calculator more accurate, useful, and user-friendly. This guide explains how you can contribute effectively.

### Understanding the Codebase

The calculator's core functionality revolves around three main concepts:

1. Date Calculations
   - Working days are calculated by excluding weekends and holidays
   - The calculator reads holidays from a CSV file to maintain flexibility
   - All date manipulations use the date-fns library for consistency

2. State Management
   - React's useState manages application state
   - The calculator tracks multiple state variables including application type, hold periods, and extensions
   - State updates trigger recalculations of working days

3. User Interface
   - The interface uses shadcn/ui components for consistency
   - Styling is handled through Tailwind CSS classes
   - The layout focuses on progressive disclosure of information

### Development Process

1. Setting Up Your Environment
   - Fork the repository to your GitHub account
   - Clone your fork locally
   - Install dependencies with `npm install`
   - Create a new branch for your changes
   - Ensure you can run the development server with `npm run dev`

2. Making Changes
   - Write clear, self-documenting code
   - Add comments for complex logic
   - Follow the existing code style and patterns
   - Test your changes thoroughly
   - Update documentation if needed

3. Testing Your Changes
   - Verify calculations with known examples
   - Test edge cases (e.g., holiday periods, overlapping holds)
   - Check mobile and desktop layouts
   - Ensure accessibility standards are maintained
   - Verify performance isn't negatively impacted

4. Submitting Changes
   - Commit your changes with clear, descriptive messages
   - Push to your fork
   - Create a pull request to the main repository
   - Describe your changes and their purpose
   - Link any related issues

### Pull Request Guidelines

When submitting a pull request:

1. Provide Context
   - Explain what problem your changes solve
   - Reference any relevant issues
   - Include screenshots for UI changes
   - Describe your testing approach

2. Keep Changes Focused
   - Address one concern per pull request
   - Avoid mixing refactoring with new features
   - Split large changes into smaller, logical chunks
   - Make sure all changes are necessary and intentional

3. Code Quality
   - Follow TypeScript best practices
   - Maintain consistent code formatting
   - Handle edge cases appropriately
   - Add appropriate error handling
   - Keep components modular and reusable

### Code Style Guidelines

We follow these principles:

1. TypeScript Usage
   - Use proper type definitions
   - Avoid `any` types where possible
   - Create interfaces for complex objects
   - Use type guards when necessary

2. Component Structure
   - Keep components focused and single-purpose
   - Use proper prop typing
   - Implement error boundaries where appropriate
   - Follow React best practices

3. Styling
   - Use Tailwind utility classes
   - Follow the existing color scheme
   - Maintain responsive design principles
   - Ensure accessibility compliance

### Common Contribution Areas

Consider contributing in these areas:

1. Functionality Improvements
   - Enhanced date calculations
   - Additional RMA timeframe rules
   - Better handling of edge cases
   - Performance optimizations

2. User Interface Enhancements
   - Improved mobile experience
   - Better data visualization
   - More intuitive controls
   - Enhanced accessibility

3. Documentation
   - Code comments
   - User guides
   - API documentation
   - Example scenarios

### Getting Help

If you need assistance:
- Create an issue for discussion
- Ask questions in pull requests
- Review existing issues and pull requests
- Check the documentation

We aim to respond to all contributions within 2-3 business days.

### Code of Conduct

We expect all contributors to:
- Be respectful and professional
- Follow established coding standards
- Provide constructive feedback
- Help maintain a positive community

Thank you for contributing to the RMA Working Days Calculator!