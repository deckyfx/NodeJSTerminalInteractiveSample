if [ -d \"build/actions/APIServer/server/public\" ]; then 
    rm -rf build/actions/APIServer/server/public 
fi 
cp -rf src/actions/APIServer/server/public build/actions/APIServer/server/ 
if [ -d \"build/actions/APIServer/server/views\" ]; then 
    rm -rf build/actions/APIServer/server/views
fi
cp -rf src/actions/APIServer/server/views build/actions/APIServer/server/