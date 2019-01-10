if exist build\\actions\\APIServer\\server\\public (rd /s /q build\\actions\\APIServer\\server\\public)
xcopy src\\actions\\APIServer\\server\\public 
if exist build\\actions\\APIServer\\server\\views (rd /s /q build\\actions\\APIServer\\server\\views)
xcopy src\\actions\\APIServer\\server\\views 
