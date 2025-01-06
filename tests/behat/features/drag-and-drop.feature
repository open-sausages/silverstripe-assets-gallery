@javascript @assets @retry @job3
Feature: Drag and drop
  As a cms author
  I want to be able to drag and drop files and folders within the CMS

  Background:
    Given a "image" "assets/folder1/file1.jpg" was created "2012-01-01 12:00:00"
      And a "image" "assets/folder1/file2.jpg" was created "2010-01-01 12:00:00"
      And a "folder" "assets/folder1/folder2"
      And a "folder" "assets/folder1/folder3"
      And the "group" "EDITOR" has permissions "Access to 'Files' section" and "FILE_EDIT_ALL"
      And I am logged in as a member of "EDITOR" group
      And I go to "/admin/assets"
      And I click on the file named "folder1" in the gallery

  Scenario: I can move files into different folders using drag-and-drop
    # drag items into a new folder one at a time
    When I drag the file named "file2" to the folder "folder2"
    And I should not see the file named "file2" in the gallery
    When I drag the folder named "folder3" to the folder "folder2"
    And I should not see the file named "folder3" in the gallery
    # check they actually moved
    When I click on the file named "folder2" in the gallery
    Then I should see the file named "file2" in the gallery
    And I should see the file named "folder3" in the gallery
    # move them both back at the same time
    When I check the file named "file2" in the gallery
    And I drag the folder named "folder3" to the back button
    Then I should not see the file named "file2" in the gallery
    And I should not see the file named "folder3" in the gallery
    # check they actually moved
    When I press the "Navigate up a level" button
    Then I should see the file named "file2" in the gallery
    And I should see the file named "folder3" in the gallery
