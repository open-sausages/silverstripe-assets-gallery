@javascript @assets @retry
Feature: Manage files
  As a cms author
  I want to upload and manage files within the CMS
  So that I can insert them into my content efficiently

  Background:
    Given a "image" "assets/folder1/file1.jpg" was created "2012-01-01 12:00:00"
      And a "image" "assets/folder1/folder1-1/file2.jpg" was created "2010-01-01 12:00:00"
      And a "folder" "assets/folder2"
      And a page "Gallery" containing an image "assets/folder3/file1.jpg"
      And I am logged in with "ADMIN" permissions
      And I go to "/admin/assets"

  @modal
  Scenario: I can add a new folder
    When I press the "Add folder" button
    Then I should see the "Form_folderCreateForm" form
      And I fill in "Name" with "newfolder"
      And I press the "Create" button
    Then I should see the file named "newfolder" in the gallery
      And I should see the "Form_fileEditForm" form

  Scenario: I can list files in a folder
    When I click on the file named "folder1" in the gallery
    Then I should see the file named "file1" in the gallery
      And I should see the file named "folder1-1" in the gallery
      And I should not see the file named "file2" in the gallery

  Scenario: I can upload a file to a folder
    When I click on the file named "folder1" in the gallery
      And I attach the file "testfile.jpg" to dropzone "gallery-container"
    Then I should see the file named "testfile" in the gallery

  Scenario: I can edit a file
    When I click on the file named "folder1" in the gallery
      And I click on the file named "file1" in the gallery
    Then I should see the "Form_fileEditForm" form
    When I fill in "renamedfile" for "Title"
      And I press the "Save" button
    Then I should see the file named "renamedfile" in the gallery
      And I should not see the file named "file1" in the gallery

  Scenario: I can edit a folder
    When I check the folder named "folder1" in the gallery
    Then I should see an ".bulk-actions__action[value='edit']" element
      And the ".bulk-actions-counter" element should contain "1"
    When I press the "Edit" button
      And I wait for 1 second
      Then I should see the "Form_fileEditForm" form
    When I fill in "foldernew" for "Name"
      And I press the "Save" button
    Then I should see the file named "foldernew" in the gallery
      And I should not see the file named "folder1" in the gallery

  Scenario: I can publish a file and unpublish a file
    When I click on the folder named "folder1" in the gallery
      And I click on the file named "file1" in the gallery
    Then I should see the "Form_fileEditForm" form
      And I should see the file status flag
    When I press the "Publish" button
    Then I should see the "Form_fileEditForm" form
      And I should not see the file status flag
    When I press the "Other actions" button
      And I press the "Unpublish" button, confirming the dialog
    Then I should see the "Form_fileEditForm" form
      And I should see the file status flag

  Scenario: I can delete a file
    When I click on the file named "folder1" in the gallery
      And I click on the file named "file1" in the gallery
    Then I should see the "Form_fileEditForm" form
    When I press the "Other actions" button
      And I press the "Delete" button, confirming the dialog
    Then I should not see the file named "file1" in the gallery

  Scenario: I can delete multiple files
    Given a "image" "assets/folder1/file2.jpg" was created "2012-01-02 12:00:00"
    When I click on the file named "folder1" in the gallery
      And I check the file named "file1" in the gallery
    Then I should see an ".bulk-actions__action[value='edit']" element
      And the ".bulk-actions-counter" element should contain "1"
    When I check the file named "file2" in the gallery
    Then the ".bulk-actions__action[value='delete']" element should contain "Delete"
      And the ".bulk-actions-counter" element should contain "2"
      And I should not see an ".bulk-actions__action[value='edit']" element
    When I attach the file "testfile.jpg" to dropzone "gallery-container"
      And I check the file named "testfile" in the gallery
    Then the ".bulk-actions-counter" element should contain "3"
      And I press the "Delete" button, confirming the dialog
    Then I should not see the file named "file1" in the gallery
      And I should not see the file named "file2" in the gallery
      And I should not see the file named "testfile" in the gallery
      And I should see "successfully archived" in the message box

  @modal
  Scenario: I cannot delete a folder containing a file that is in use
    When I check the file named "folder3" in the gallery
    Then I press the "Delete" button
      And I see the text "currently in use" in the alert
      And I see the text "before you can delete the folder" in the alert
      And I confirm the dialog
    Then I should see the file named "folder3" in the gallery

  @modal
  Scenario: I can delete a file that is in use with a warning
    When I click on the file named "folder3" in the gallery
      And I check the file named "file1" in the gallery
    Then I press the "Delete" button
      And I see the text "file is currently in use" in the alert
      And I confirm the dialog
    Then I should see "successfully archived" in the message box
      And I should not see the file named "file1" in the gallery

  Scenario: I can move a file through editing
    When I click on the file named "folder1" in the gallery
      And I click on the file named "file1" in the gallery
    Then I should see the "Form_fileEditForm" form
    When I click "folder1" in the ".Select-value" element
      And I click "(root)" in the ".treedropdownfield__menu" element
      And I press the "Save" button
    Then I should see the file named "file1" in the gallery
      And I should see the file named "folder1" in the gallery
      And I should not see "File cannot be found" in the "#Form_fileEditForm" element
    # test moving again to see if Tuple has updated value
    When I click "(root)" in the ".Select-value" element
      And I click "folder2" in the ".treedropdownfield__menu" element
      And I press the "Save" button
    Then I should see the file named "file1" in the gallery
      And I should not see the file named "folder2" in the gallery
      And I should not see "File cannot be found" in the "#Form_fileEditForm" element
